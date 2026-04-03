import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/nav'
import { TIER_META, type Tier } from '@/types'
import { FileText, Plus, Eye, EyeOff, Lock } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/dashboard')
  }

  // Check subscription status
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status')
    .eq('id', user.id)
    .single()

  const isSubscribed = profile?.subscription_status === 'active'

  // Fetch user's submissions with evaluations
  const { data: submissions } = await supabase
    .from('script_submissions')
    .select(`
      id, title, status, is_public, created_at,
      script_evaluations ( id, weighted_score, tier )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <>
      <Nav />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Your Scripts</h1>
            <p className="text-sm text-[var(--gem-gray-400)] mt-1">
              {isSubscribed
                ? 'All your submitted scripts and evaluations'
                : 'Subscribe to unlock full reports and leaderboard access'}
            </p>
          </div>
          <Link
            href="/submit"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm bg-[var(--gem-accent)] text-white hover:bg-[var(--gem-accent-hover)] transition-colors"
          >
            <Plus size={16} />
            New Script
          </Link>
        </div>

        {submissions && submissions.length > 0 ? (
          <div className="space-y-3">
            {submissions.map((sub: any) => {
              // script_evaluations is a 1-to-1 relation (unique submission_id)
              // Supabase may return it as object or array depending on schema detection
              const rawEval = sub.script_evaluations
              const eval_ = Array.isArray(rawEval) ? rawEval[0] : rawEval
              const tierMeta = eval_ ? TIER_META[eval_.tier as Tier] : null

              const hasReport = !!eval_
              const Wrapper = hasReport ? Link : 'div'
              const wrapperProps = hasReport
                ? { href: `/report/${eval_.id}` }
                : {}

              return (
                <Wrapper
                  key={sub.id}
                  {...(wrapperProps as any)}
                  className={`group flex items-center gap-4 p-4 rounded-xl border bg-[var(--gem-gray-900)] transition-colors ${
                    hasReport
                      ? 'border-[var(--gem-gray-700)] hover:border-[var(--gem-gray-500)] cursor-pointer'
                      : 'border-[var(--gem-gray-800)] opacity-60'
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-[var(--gem-gray-800)] border border-[var(--gem-gray-700)] flex items-center justify-center shrink-0">
                    <FileText size={18} className="text-[var(--gem-gray-400)]" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-white truncate group-hover:text-[var(--gem-accent)] transition-colors">
                        {sub.title}
                      </h3>
                      {sub.is_public ? (
                        <Eye size={14} className="text-emerald-400 shrink-0" />
                      ) : (
                        <EyeOff size={14} className="text-[var(--gem-gray-500)] shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-[var(--gem-gray-500)] mt-0.5">
                      {new Date(sub.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>

                  {eval_ && (
                    <div className="text-right shrink-0 flex items-center gap-3">
                      <div>
                        <div className={`text-lg font-bold ${
                          eval_.weighted_score >= 80 ? 'text-emerald-400' :
                          eval_.weighted_score >= 70 ? 'text-amber-400' :
                          eval_.weighted_score >= 60 ? 'text-blue-400' :
                          eval_.weighted_score >= 50 ? 'text-zinc-400' :
                          'text-zinc-500'
                        }`}>
                          {Math.round(eval_.weighted_score)}
                        </div>
                        {tierMeta && (
                          <span className={`text-xs ${tierMeta.colorClass}`}>
                            {tierMeta.label}
                          </span>
                        )}
                      </div>
                      {!isSubscribed && (
                        <Lock size={14} className="text-[var(--gem-gray-500)]" />
                      )}
                    </div>
                  )}

                  {sub.status === 'failed' && (
                    <span className="text-xs text-red-400/70 shrink-0">Failed</span>
                  )}
                  {sub.status === 'processing' && (
                    <span className="text-xs text-amber-400/70 shrink-0 animate-pulse">Processing...</span>
                  )}
                </Wrapper>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-20 border border-dashed border-[var(--gem-gray-700)] rounded-xl">
            <FileText size={32} className="mx-auto text-[var(--gem-gray-500)] mb-3" />
            <p className="text-[var(--gem-gray-400)] text-sm mb-4">
              No scripts submitted yet.
            </p>
            <Link
              href="/submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm bg-[var(--gem-accent)] text-white hover:bg-[var(--gem-accent-hover)] transition-colors"
            >
              Submit your first script
            </Link>
          </div>
        )}
      </div>
    </>
  )
}
