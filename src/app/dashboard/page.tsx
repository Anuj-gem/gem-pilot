import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/nav'
import {
  FileText,
  Plus,
  Eye,
  EyeOff,
  Compass,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Users,
  Lock,
} from 'lucide-react'
import { UnlockTrigger } from '@/components/dashboard/unlock-trigger'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/dashboard')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, full_name')
    .eq('id', user.id)
    .single()

  const isSubscribed = profile?.subscription_status === 'active'

  const { data: submissions } = await supabase
    .from('script_submissions')
    .select(`
      id, title, status, is_public, created_at,
      script_evaluations ( id, evaluation, created_at )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const totalSubmissions = submissions?.length ?? 0
  const publicCount =
    submissions?.filter((s: any) => s.is_public).length ?? 0
  const completedCount =
    submissions?.filter((s: any) => s.status === 'completed').length ?? 0
  const usedFreeEval = completedCount >= 1

  const firstName =
    profile?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'there'

  return (
    <>
      <Nav />
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-10">
        {/* Upgrade banner — only for non-subscribers who've used their free eval */}
        {!isSubscribed && usedFreeEval && (
          <div className="mb-8 rounded-xl border border-[var(--gem-gray-700)] p-5 sm:p-6">
            <p className="text-sm font-semibold text-[var(--gem-white)] mb-1">
              Your report is ready. Now get it seen.
            </p>
            <p className="text-sm text-[var(--gem-gray-400)] mb-4">
              Go Pro to publish on Discover, let producers contact you, and evaluate unlimited scripts.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4 text-xs text-[var(--gem-gray-300)]">
              <div className="flex items-center gap-2">
                <Sparkles size={12} className="text-[var(--gem-accent)] shrink-0" />
                Unlimited evaluations
              </div>
              <div className="flex items-center gap-2">
                <Compass size={12} className="text-[var(--gem-accent)] shrink-0" />
                Feature scripts on Discover
              </div>
              <div className="flex items-center gap-2">
                <Users size={12} className="text-[var(--gem-accent)] shrink-0" />
                Producers contact you directly
              </div>
            </div>
            <UnlockTrigger
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-[var(--gem-accent)] text-white hover:bg-[var(--gem-accent-hover)] transition-all"
              ariaLabel="Upgrade to Pro"
            >
              Go Pro — $20/mo
            </UnlockTrigger>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold font-[family-name:var(--font-display)] leading-tight">
              Welcome back, {firstName}.
            </h1>
            <p className="text-sm text-[var(--gem-gray-400)] mt-2">
              {totalSubmissions === 0
                ? 'Submit your first script to get a full evaluation and positioning report.'
                : isSubscribed
                  ? `${totalSubmissions} script${totalSubmissions === 1 ? '' : 's'} in your portfolio · ${publicCount} on Discover`
                  : `${totalSubmissions} script${totalSubmissions === 1 ? '' : 's'} evaluated. Go Pro to publish on Discover and let producers reach you.`}
            </p>
          </div>
          <Link
            href="/submit"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--gem-accent)] text-white hover:bg-[var(--gem-accent-hover)] transition-colors shrink-0"
          >
            <Plus size={16} />
            New Script
          </Link>
        </div>

        {submissions && submissions.length > 0 ? (
          <>
            {/* Script cards */}
            <div className="space-y-3 mb-10">
              {(() => {
                // Find the oldest completed submission — that one is free.
                // All others are locked for non-subscribers.
                const completedSubs = (submissions as any[])
                  .filter((s: any) => s.status === 'completed')
                  .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                const firstFreeId = completedSubs[0]?.id ?? null

                return (submissions as any[]).map((sub: any) => {
                const rawEval = sub.script_evaluations
                const eval_ = Array.isArray(rawEval) ? rawEval[0] : rawEval
                const hasReport = !!eval_
                const positioningHook: string | null =
                  eval_?.evaluation?.positioning_hook ?? null
                const isLockedReport = !isSubscribed && hasReport && sub.status === 'completed' && sub.id !== firstFreeId

                const dateStr = new Date(sub.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })

                const reviseHref = `/submit?title=${encodeURIComponent(sub.title)}`

                return (
                  <div
                    key={sub.id}
                    className={`group rounded-xl border transition-colors p-5 ${
                      isLockedReport
                        ? 'border-[var(--gem-gold)]/30 bg-[var(--gem-gold)]/5'
                        : !hasReport
                          ? 'border-[var(--gem-gray-700)] opacity-60'
                          : 'border-[var(--gem-gray-700)] hover:border-[var(--gem-gray-500)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        {/* Title + state pills */}
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <h3 className="text-base font-semibold text-[var(--gem-white)] truncate">
                            {sub.title}
                          </h3>
                          {isLockedReport ? (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-[var(--gem-gold)]/40 bg-[var(--gem-gold)]/10 text-[var(--gem-gold)] font-medium">
                              <Lock size={10} />
                              Upgrade to view
                            </span>
                          ) : sub.is_public ? (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-medium">
                              <Eye size={10} />
                              On Discover
                            </span>
                          ) : hasReport ? (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-[var(--gem-gray-700)] text-[var(--gem-gray-500)] font-medium">
                              <EyeOff size={10} />
                              Private
                            </span>
                          ) : null}
                          {sub.status === 'failed' && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full border border-red-500/30 bg-red-500/10 text-red-400 font-medium">
                              Failed
                            </span>
                          )}
                          {sub.status === 'processing' && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 font-medium animate-pulse">
                              Processing
                            </span>
                          )}
                        </div>

                        {/* Positioning hook or placeholder */}
                        {isLockedReport ? (
                          <p className="text-sm text-[var(--gem-gray-400)] mb-2">
                            Your report is ready — upgrade to Pro to read it.
                          </p>
                        ) : positioningHook ? (
                          <p className="text-sm text-[var(--gem-gray-300)] leading-snug line-clamp-2 mb-2">
                            {positioningHook}
                          </p>
                        ) : hasReport ? (
                          <p className="text-sm text-[var(--gem-gray-500)] italic mb-2">
                            Report ready — open to see the positioning.
                          </p>
                        ) : null}

                        <div className="text-xs text-[var(--gem-gray-500)]">{dateStr}</div>
                      </div>

                      {/* Actions */}
                      {hasReport && (
                        <div className="flex items-center gap-2 shrink-0">
                          {isLockedReport ? (
                            <UnlockTrigger
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--gem-gold)] text-white hover:brightness-110 transition-all"
                              ariaLabel="Upgrade to view report"
                            >
                              Upgrade — $20/mo
                            </UnlockTrigger>
                          ) : (
                            <>
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
                                View report
                                <ArrowRight size={12} />
                              </Link>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
              })()}
            </div>

            {/* What's next rail */}
            <div className="border-t border-[var(--gem-gray-700)] pt-8">
              <h2 className="text-xs uppercase tracking-[0.14em] text-[var(--gem-gray-500)] font-semibold mb-4">
                What&apos;s next
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <Link
                  href="/submit"
                  className="group rounded-xl border border-[var(--gem-gray-700)] hover:border-[var(--gem-accent)] p-4 transition-colors"
                >
                  <Plus size={16} className="text-[var(--gem-accent)] mb-2" />
                  <div className="text-sm font-semibold mb-1">Submit another draft</div>
                  <div className="text-xs text-[var(--gem-gray-400)] leading-snug">
                    Test a new angle, a rewrite, or a different script.
                  </div>
                </Link>

                <Link
                  href="/discover"
                  className="group rounded-xl border border-[var(--gem-gray-700)] hover:border-[var(--gem-accent)] p-4 transition-colors"
                >
                  <Compass size={16} className="text-[var(--gem-accent)] mb-2" />
                  <div className="text-sm font-semibold mb-1">Browse Discover</div>
                  <div className="text-xs text-[var(--gem-gray-400)] leading-snug">
                    See what other writers are putting in front of the industry.
                  </div>
                </Link>
              </div>
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
