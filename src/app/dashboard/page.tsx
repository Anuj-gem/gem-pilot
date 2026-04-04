import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/nav'
import { TIER_META, type Tier } from '@/types'
import { FileText, Plus, Eye, EyeOff, Lock, Compass, ArrowRight } from 'lucide-react'
import { ScoreRing } from '@/components/ui/score-ring'

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
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold font-[family-name:var(--font-display)]">Your Portfolio</h1>
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
          <>
            {/* Personal stats bar */}
            <div className="flex gap-8 mb-8 pb-8 border-b border-[var(--gem-gray-700)]">
              {(() => {
                const totalScripts = submissions.length
                const evaluations = submissions
                  .map(sub => {
                    const rawEval = sub.script_evaluations
                    return Array.isArray(rawEval) ? rawEval[0] : rawEval
                  })
                  .filter(Boolean)

                const scores = evaluations
                  .map(e => e.weighted_score)
                  .filter(s => typeof s === 'number')

                const highestScore = scores.length > 0 ? Math.max(...scores) : null
                const avgScore = scores.length > 0
                  ? (scores.reduce((a, b) => a + b, 0) / scores.length)
                  : null

                return (
                  <>
                    <div>
                      <div className="text-3xl font-bold text-white">{totalScripts}</div>
                      <div className="text-xs text-[var(--gem-gray-400)] mt-1">Scripts Submitted</div>
                    </div>
                    {highestScore !== null && (
                      <div>
                        <div className="text-3xl font-bold text-emerald-400">{Math.round(highestScore)}</div>
                        <div className="text-xs text-[var(--gem-gray-400)] mt-1">Highest Score</div>
                      </div>
                    )}
                    {avgScore !== null && (
                      <div>
                        <div className="text-3xl font-bold text-amber-400">{Math.round(avgScore)}</div>
                        <div className="text-xs text-[var(--gem-gray-400)] mt-1">Average Score</div>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>

            {/* Leaderboard nudge at top on mobile */}
            <Link
              href="/discover"
              className="sm:hidden flex items-center gap-2 p-3 rounded-xl border border-[var(--gem-gray-700)] bg-[var(--gem-gray-900)] text-sm text-[var(--gem-gray-300)] hover:text-white transition-colors mb-6"
            >
              <Compass size={16} className="text-[var(--gem-accent)] shrink-0" />
              <span className="flex-1">See how other writers scored on the leaderboard</span>
              <ArrowRight size={14} className="shrink-0" />
            </Link>

            {/* Card grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

                const dateStr = new Date(sub.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })

                return (
                  <Wrapper
                    key={sub.id}
                    {...(wrapperProps as any)}
                    className={`group rounded-xl border p-5 transition-all ${
                      hasReport
                        ? 'border-[var(--gem-gray-700)] bg-[var(--gem-gray-900)] hover:border-[var(--gem-gray-500)] hover:shadow-lg hover:shadow-[var(--gem-accent)]/10 cursor-pointer'
                        : 'border-[var(--gem-gray-800)] bg-[var(--gem-gray-900)] opacity-60'
                    }`}
                  >
                    {/* Title and visibility */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h3 className="font-bold text-white text-sm truncate group-hover:text-[var(--gem-accent)] transition-colors flex-1">
                        {sub.title}
                      </h3>
                      {sub.is_public ? (
                        <Eye size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                      ) : isSubscribed ? (
                        <span className="text-xs text-[var(--gem-gray-400)] whitespace-nowrap">Private</span>
                      ) : (
                        <Lock size={14} className="text-[var(--gem-gray-500)] shrink-0 mt-0.5" />
                      )}
                    </div>

                    {/* Date */}
                    <p className="text-xs text-[var(--gem-gray-500)] mb-4">
                      {dateStr}
                    </p>

                    {/* Score ring and tier badge */}
                    {eval_ && (
                      <div className="flex items-center justify-between mb-4">
                        <ScoreRing
                          score={eval_.weighted_score}
                          size={56}
                          strokeWidth={3}
                        />
                        {tierMeta && (
                          <div className={`text-xs font-medium px-2.5 py-1.5 rounded-full ${tierMeta.bgClass} border`}>
                            <span className={tierMeta.colorClass}>{tierMeta.label}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Status indicators */}
                    {sub.status === 'failed' && (
                      <span className="text-xs text-red-400/70 block">Failed</span>
                    )}
                    {sub.status === 'processing' && (
                      <span className="text-xs text-amber-400/70 animate-pulse block">Processing...</span>
                    )}
                  </Wrapper>
                )
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-20 border border-dashed border-[var(--gem-gray-700)] rounded-xl">
            <FileText size={32} className="mx-auto text-[var(--gem-gray-500)] mb-3" />
            <p className="text-[var(--gem-gray-400)] text-sm mb-4">
              No scripts submitted yet.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm bg-[var(--gem-accent)] text-white hover:bg-[var(--gem-accent-hover)] transition-colors"
              >
                Submit your first script
              </Link>
              <Link
                href="/discover"
                className="inline-flex items-center gap-1.5 text-sm text-[var(--gem-gray-400)] hover:text-white transition-colors"
              >
                <Compass size={14} />
                Browse the leaderboard
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
