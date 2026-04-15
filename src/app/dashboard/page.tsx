import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/nav'
import { TIER_META, type Tier } from '@/types'
import { tierLabel } from '@/lib/tier-display'
import { FileText, Plus, Eye, Compass, ArrowRight, RefreshCw, Sparkles } from 'lucide-react'
import { UnlockTrigger } from '@/components/dashboard/unlock-trigger'

export const dynamic = 'force-dynamic'

function tierColor(tier: string) {
  if (tier === 'Greenlight Material') return 'var(--tier-greenlight)'
  if (tier === 'Optionable') return 'var(--tier-optionable)'
  return 'var(--tier-needs-dev)'
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/dashboard')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status')
    .eq('id', user.id)
    .single()

  const isSubscribed = profile?.subscription_status === 'active'

  const { data: submissions } = await supabase
    .from('script_submissions')
    .select(`
      id, title, status, is_public, created_at,
      script_evaluations ( id, weighted_score, tier )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const totalSubmissions = submissions?.length ?? 0

  return (
    <>
      <Nav />
      <div className="max-w-4xl mx-auto px-4 py-8">
        {!isSubscribed && totalSubmissions > 0 && (
          <div className="mb-6 flex items-center justify-between gap-3 p-3 rounded-lg border border-[var(--gem-gold)]/30 bg-[var(--gem-gold)]/5 flex-wrap">
            <p className="text-sm text-[var(--gem-gray-300)]">
              Unlock your score + full critique — top-scored scripts get surfaced to our industry network.
            </p>
            <UnlockTrigger
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--gem-gold)] text-white hover:brightness-110 transition-all"
              ariaLabel="Unlock your report"
            >
              <Sparkles size={12} />
              Unlock — $20/mo
            </UnlockTrigger>
          </div>
        )}
        <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold font-[family-name:var(--font-display)]">Your Portfolio</h1>
            <p className="text-sm text-[var(--gem-gray-400)] mt-1">
              {isSubscribed
                ? 'All your submitted scripts and evaluations'
                : 'Submit scripts, get positioned, and get surfaced to producers'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isSubscribed && (
              <UnlockTrigger
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm border border-[var(--gem-accent)] text-[var(--gem-accent)] hover:bg-[var(--gem-accent)] hover:text-white transition-colors"
                ariaLabel="Upgrade to GEM Pro"
              >
                <Sparkles size={16} />
                Upgrade to GEM Pro
              </UnlockTrigger>
            )}
            <Link
              href="/submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm bg-[var(--gem-accent)] text-white hover:bg-[var(--gem-accent-hover)] transition-colors"
            >
              <Plus size={16} />
              New Script
            </Link>
          </div>
        </div>

        {submissions && submissions.length > 0 ? (
          <>
            {/* Personal stats */}
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
                      <div className="text-3xl font-bold">{totalScripts}</div>
                      <div className="text-xs text-[var(--gem-gray-400)] mt-1">Scripts</div>
                    </div>
                    {highestScore !== null && (
                      <div>
                        <div className="text-3xl font-bold" style={{ color: 'var(--tier-greenlight)' }}>{Math.round(highestScore)}</div>
                        <div className="text-xs text-[var(--gem-gray-400)] mt-1">Highest</div>
                      </div>
                    )}
                    {avgScore !== null && (
                      <div>
                        <div className="text-3xl font-bold" style={{ color: 'var(--tier-optionable)' }}>{Math.round(avgScore)}</div>
                        <div className="text-xs text-[var(--gem-gray-400)] mt-1">Average</div>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>

            {/* Discover nudge (mobile) */}
            <Link
              href="/discover"
              className="sm:hidden flex items-center gap-2 p-3 rounded-lg border border-[var(--gem-gray-700)] text-sm text-[var(--gem-gray-300)] hover:text-[var(--gem-white)] transition-colors mb-6"
            >
              <Compass size={16} className="text-[var(--gem-accent)] shrink-0" />
              <span className="flex-1">Browse other writers on Discover</span>
              <ArrowRight size={14} className="shrink-0" />
            </Link>

            {/* Script list — clean, no floating boxes */}
            <div className="divide-y divide-[var(--gem-gray-700)]">
              {submissions.map((sub: any) => {
                const rawEval = sub.script_evaluations
                const eval_ = Array.isArray(rawEval) ? rawEval[0] : rawEval
                const tierMeta = eval_ ? TIER_META[eval_.tier as Tier] : null
                const hasReport = !!eval_

                const dateStr = new Date(sub.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })

                const reviseHref = `/submit?title=${encodeURIComponent(sub.title)}`

                const rowContent = (
                  <div className={`flex items-center gap-4 py-4 ${!hasReport ? 'opacity-50' : ''}`}>
                    {/* Score */}
                    <div className="w-12 shrink-0 text-center">
                      {eval_ ? (
                        <span className="text-xl font-bold tabular-nums" style={{ color: tierColor(eval_.tier) }}>
                          {Math.round(eval_.weighted_score)}
                        </span>
                      ) : (
                        <span className="text-sm text-[var(--gem-gray-500)]">—</span>
                      )}
                    </div>

                    {/* Info — title + tier pill on one line, date below */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold truncate">
                          {sub.title}
                        </h3>
                        {tierMeta && (
                          <span className={`text-[10px] px-2.5 py-1 rounded-full border font-medium shrink-0 ${tierMeta.bgClass} ${tierMeta.colorClass}`}>
                            {tierLabel(eval_.tier as Tier)}
                          </span>
                        )}
                        {sub.is_public && (
                          <Eye size={12} className="text-emerald-600 shrink-0" />
                        )}
                      </div>
                      <div className="text-xs text-[var(--gem-gray-500)] mt-0.5">{dateStr}</div>
                    </div>

                    {/* Status */}
                    {sub.status === 'failed' && (
                      <span className="text-xs text-red-500 shrink-0">Failed</span>
                    )}
                    {sub.status === 'processing' && (
                      <span className="text-xs text-amber-600 animate-pulse shrink-0">Processing...</span>
                    )}

                    {/* Actions — two clear buttons with breathing room */}
                    {hasReport && (
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <Link
                          href={reviseHref}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--gem-gray-700)] text-[var(--gem-gray-300)] hover:text-[var(--gem-white)] hover:border-[var(--gem-gray-500)] transition-colors"
                        >
                          <RefreshCw size={12} />
                          Revise
                        </Link>
                        <Link
                          href={`/report/${eval_.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--gem-accent)] text-white hover:bg-[var(--gem-accent-hover)] transition-colors"
                        >
                          View full report
                          <ArrowRight size={12} />
                        </Link>
                      </div>
                    )}
                  </div>
                )

                return <div key={sub.id}>{rowContent}</div>
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
                className="inline-flex items-center gap-1.5 text-sm text-[var(--gem-gray-400)] hover:text-[var(--gem-white)] transition-colors"
              >
                <Compass size={14} />
                Browse Discover
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
