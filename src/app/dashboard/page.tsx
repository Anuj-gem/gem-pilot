// Writer dashboard — Selznick-4 v4 layout (UI overhaul, 2026-04-25).
//
// Goal: cut every signal that isn't load-bearing for "what do I do next?".
//
// What's gone from the dashboard, and where it lives instead:
//   - Score (and score-band copy) → report page only. Score is evaluative,
//     not an ambient writer-facing scoreboard.
//   - Inline tags editor → report page top card (already moved).
//   - Per-row industry-match detail panel → producer name/email/comment now
//     live on the report page; the dashboard surfaces a single pill so the
//     writer knows there's traction without the row noise.
//   - Edit / Remove / privacy pills on each card → all owner actions live
//     on the report page from now on.
//
// Card shape (returning user, ≥2 scripts):
//   Title + status pill + (if any) "N producers interested"
//   Headline (1 line, optional)
//   Submitted date · primary action button
//
// First-script hero: when the writer has exactly one submission, that card
// renders centered so the new-user moment is unambiguous. State machine:
//   - processing       → "We're reading your script. About a minute." +
//                        a 3-line preview of what's about to happen.
//   - awaiting_pdf     → "One more step — upload your PDF" + Upload PDF.
//   - failed           → "Something went wrong" + Try again.
//   - completed/locked → "Your report is ready" + Upgrade CTA.
//   - completed/open   → "Your report is ready" + View Report (primary) +
//                        Publish to producers (secondary, only when private)
//                        + Privacy controls (link, only when private).
//                        When already public, the line below shows visibility
//                        and any producer-interested count.
//
// Match detail (producer name, comment, mailto) is intentionally NOT shown
// on the dashboard anymore — too much per-row noise for what the writer
// actually needs at-a-glance. Detail surfaces inside the report page.

import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/nav'
import { FileText, Plus, ArrowRight, Lock, Upload } from 'lucide-react'
import { UnlockTrigger } from '@/components/dashboard/unlock-trigger'
import { UpgradeModalListener } from '@/components/dashboard/upgrade-modal-listener'
import { RealtimeRefresh } from '@/components/dashboard/realtime-refresh'
import { DashboardPrivacyButton } from '@/components/dashboard/privacy-button'
import { OwnerActionsMenu } from '@/components/report/owner-actions-menu'
import { ProcessingPoller } from '@/components/dashboard/processing-poller'
import { SocialDashboardTop } from '@/components/dashboard/social-top'
import {
  IndustryActivityButton,
  type IndustryActivityRow,
} from '@/components/dashboard/industry-activity-button'
import type { ReportPrivacy } from '@/lib/report-privacy'

export const dynamic = 'force-dynamic'

interface ScriptSummary {
  id: string
  title: string
  status: string
  is_public: boolean
  created_at: string
  declared_format: string | null
  hasReport: boolean
  evaluationId: string | null
  positioningHook: string | null
  isLockedReport: boolean
  interestedCount: number
  reportPrivacy: ReportPrivacy | null
  /** Full producer-side activity for this script, sorted newest first.
   *  Drives the "Activity" button on the card. Empty array if nobody's
   *  engaged yet. */
  activity: IndustryActivityRow[]
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome_back?: string; draft_saved?: string; just_signed_up?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/dashboard')
  }

  const sp = await searchParams
  const justDraftSaved = sp.draft_saved === '1'
  const justSignedUp = sp.just_signed_up === '1'
  const welcomeBack = sp.welcome_back === '1'

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, full_name, handle, headline, avatar_url')
    .eq('id', user.id)
    .single()

  // Forced profile onboarding (Anuj 2026-04-29 v0.3) — every user must
  // have a handle + headline before they can use the rest of the app.
  // Bounces straight to /profile?onboarding=1 which shows the welcome state.
  if (!profile?.handle || !profile?.headline) {
    redirect('/profile?onboarding=1')
  }

  const isSubscribed = profile?.subscription_status === 'active'

  // Pull ALL submissions (incl. soft-hidden) so the free-eval check sees
  // them — a writer who hides their first script still counts as having
  // used their free evaluation.
  const { data: allSubmissions } = await supabase
    .from('script_submissions')
    .select(`
      id, title, status, is_public, created_at, hidden_at, declared_format,
      report_privacy,
      script_evaluations ( id, evaluation, edited_fields, created_at, weighted_score )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const visible = (allSubmissions ?? []).filter((s: any) => !s.hidden_at)
  const completedCount =
    (allSubmissions ?? []).filter((s: any) => s.status === 'completed').length
  const usedFreeEval = completedCount >= 1

  const submissionIds: string[] = visible.map((s: any) => s.id)

  // Pull every meaningful match for the writer's visible scripts so the
  // dashboard activity card can show the per-producer breakdown (name +
  // company + status + date). We exclude `pending` rows — those haven't
  // even been opened yet and would be noise.
  const interestedBySubmission = new Map<string, number>()
  const activityBySubmission = new Map<string, IndustryActivityRow[]>()
  if (submissionIds.length > 0) {
    type RawMatchRow = {
      id: string
      submission_id: string
      producer_id: string
      status: 'pending' | 'opened' | 'interested' | 'commented' | 'passed'
      comment: string | null
      created_at: string
      opened_at: string | null
      reacted_at: string | null
      producer_emailed_at: string | null
      unmatched_at: string | null
    }
    const { data: matchRows } = await supabase
      .from('script_matches')
      .select(
        'id, submission_id, producer_id, status, comment, created_at, opened_at, reacted_at, producer_emailed_at, unmatched_at'
      )
      .in('submission_id', submissionIds)
      .in('status', ['opened', 'interested', 'commented', 'passed'])

    const rawRows: RawMatchRow[] = (matchRows ?? []) as RawMatchRow[]

    // Producer profile lookup for name + company + role.
    const producerIds = Array.from(new Set(rawRows.map((r) => r.producer_id)))
    const producerInfo = new Map<
      string,
      {
        full_name: string | null
        email: string | null
        company_name: string | null
        industry_role: 'producer' | 'representative' | null
      }
    >()
    if (producerIds.length > 0) {
      const { data: producers } = await supabase
        .from('profiles')
        .select('id, full_name, email, company_name, industry_role')
        .in('id', producerIds)
      for (const p of (producers ?? []) as any[]) {
        producerInfo.set(p.id, {
          full_name: p.full_name ?? null,
          email: p.email ?? null,
          company_name: p.company_name ?? null,
          industry_role:
            p.industry_role === 'producer' || p.industry_role === 'representative'
              ? p.industry_role
              : null,
        })
      }
    }

    for (const row of rawRows) {
      // Live (non-unmatched) interested counts drive the small
      // "N producers interested" pill on the title row.
      if (
        !row.unmatched_at &&
        (row.status === 'interested' || row.status === 'commented')
      ) {
        interestedBySubmission.set(
          row.submission_id,
          (interestedBySubmission.get(row.submission_id) ?? 0) + 1
        )
      }

      const info = producerInfo.get(row.producer_id) ?? null
      const computedName = (() => {
        const fn = info?.full_name?.trim()
        if (fn) return fn
        if (info?.email) return info.email.split('@')[0]
        return null
      })()
      const happenedAt =
        row.reacted_at ?? row.opened_at ?? row.created_at ?? null

      const shaped: IndustryActivityRow = {
        matchId: row.id,
        status: row.status,
        producerName: computedName,
        producerCompany: info?.company_name ?? null,
        producerRole: info?.industry_role ?? null,
        happenedAt,
        comment: row.comment,
        producerEmailedAt: row.producer_emailed_at,
        unmatchedAt: row.unmatched_at,
      }
      const arr = activityBySubmission.get(row.submission_id) ?? []
      arr.push(shaped)
      activityBySubmission.set(row.submission_id, arr)
    }

    // Sort each submission's activity newest first.
    for (const [k, arr] of activityBySubmission) {
      arr.sort((a, b) => {
        const av = a.happenedAt ? new Date(a.happenedAt).getTime() : 0
        const bv = b.happenedAt ? new Date(b.happenedAt).getTime() : 0
        return bv - av
      })
      activityBySubmission.set(k, arr)
    }
  }

  // Find the oldest completed submission — that one is free. All later
  // completed submissions are paywalled for non-subscribers.
  const completedSubs = ((allSubmissions ?? []) as any[])
    .filter((s: any) => s.status === 'completed')
    .sort(
      (a: any, b: any) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  const firstFreeId: string | null = completedSubs[0]?.id ?? null

  // Build per-script summary used by the renderers below.
  const scripts: ScriptSummary[] = (visible as any[]).map((sub) => {
    const rawEval = sub.script_evaluations
    const eval_ = Array.isArray(rawEval) ? rawEval[0] : rawEval
    const hasReport = !!eval_
    const editedLogline =
      typeof eval_?.edited_fields?.logline === 'string' &&
      eval_.edited_fields.logline.trim().length > 0
        ? eval_.edited_fields.logline
        : null
    const positioningHook: string | null =
      editedLogline ?? eval_?.evaluation?.positioning_hook ?? null
    const isLockedReport =
      !isSubscribed &&
      hasReport &&
      sub.status === 'completed' &&
      sub.id !== firstFreeId
    return {
      id: sub.id,
      title: sub.title,
      status: sub.status,
      is_public: !!sub.is_public,
      created_at: sub.created_at,
      declared_format: sub.declared_format ?? null,
      hasReport,
      evaluationId: eval_?.id ?? null,
      positioningHook,
      isLockedReport,
      interestedCount: interestedBySubmission.get(sub.id) ?? 0,
      reportPrivacy: (sub.report_privacy as ReportPrivacy | null) ?? null,
      activity: activityBySubmission.get(sub.id) ?? [],
    }
  })

  const totalSubmissions = scripts.length
  const totalInterested = Array.from(interestedBySubmission.values()).reduce(
    (n, v) => n + v,
    0
  )

  const firstName =
    profile?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'there'

  // Hero treatment fires when the writer has exactly one submission. This
  // captures the new-user onboarding moment without needing any explicit
  // "first time" flag — once they have a 2nd script the dashboard collapses
  // to the regular card list.
  const heroScript = scripts.length === 1 ? scripts[0] : null

  return (
    <>
      <Nav />
      {!isSubscribed && <UpgradeModalListener />}
      {submissionIds.length > 0 && (
        <RealtimeRefresh writerId={user.id} submissionIds={submissionIds} />
      )}
      {/* Poll while any script is in `processing` so the hero card flips
          from "We're reading your script" to "Your report is ready"
          without a manual refresh. Anuj 2026-04-28. */}
      <ProcessingPoller
        active={scripts.some((s) => s.status === 'processing')}
      />
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-10">
        {/* v0.4 social-feel top: hero + action-needed + following feed +
            Discover preview. Renders before the personal-scripts list so
            the network IS the dashboard. Anuj 2026-04-29. */}
        <SocialDashboardTop
          user={{ id: user.id, email: user.email }}
          profile={{
            id: user.id,
            full_name: profile?.full_name ?? null,
            handle: profile?.handle ?? null,
            headline: profile?.headline ?? null,
            avatar_url: profile?.avatar_url ?? null,
          }}
        />

        {/* Free writers with their first script see a Pro upsell at the
            very top of the dashboard — replaces the lighter "you're
            signed up" banner with a banner that lands the upgrade pitch
            on the most attention-rich moment we have. Anuj 2026-04-28. */}
        {!isSubscribed && totalSubmissions === 1 ? (
          <FirstScriptUpsellBanner />
        ) : (
          (welcomeBack || justDraftSaved || justSignedUp) && (
            <WelcomeBanner
              welcomeBack={welcomeBack}
              justDraftSaved={justDraftSaved}
              justSignedUp={justSignedUp}
              firstName={firstName}
            />
          )
        )}

        {/* Greeting strip — gold rule, big editorial title, supporting line */}
        <div className="flex items-end justify-between gap-4 flex-wrap mb-8">
          <div>
            <div
              className="w-12 h-0.5 mb-3.5 rounded-sm"
              style={{ background: 'var(--gem-gold)' }}
            />
            <h1 className="text-3xl sm:text-[32px] font-extrabold font-[family-name:var(--font-display)] tracking-tight text-[var(--gem-gray-50)] leading-tight m-0">
              Welcome back, {firstName}.
            </h1>
            {totalSubmissions > 0 && (
              <p className="text-[14px] text-[var(--gem-gray-400)] m-0 mt-2">
                {totalSubmissions} active script{totalSubmissions === 1 ? '' : 's'}
                {totalInterested > 0 && (
                  <>
                    <span className="text-[var(--gem-gray-500)] mx-2">·</span>
                    <span className="text-[var(--gem-gray-100)] font-semibold">{totalInterested}</span>{' '}
                    producer{totalInterested === 1 ? '' : 's'} interested
                  </>
                )}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={profile?.handle ? `/w/${profile.handle}` : '/profile'}
              className="px-3 py-2 rounded-lg text-xs font-semibold text-[var(--gem-gray-300)] hover:text-[var(--gem-gray-50)] hover:bg-[var(--gem-gray-800)] transition-colors"
            >
              View public profile
            </Link>
            <Link
              href="/profile"
              className="px-3 py-2 rounded-lg text-xs font-semibold text-[var(--gem-gray-300)] hover:text-[var(--gem-gray-50)] hover:bg-[var(--gem-gray-800)] transition-colors"
            >
              Edit profile
            </Link>
            <Link
              href="/submit"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold bg-[var(--gem-accent)] text-white hover:bg-[var(--gem-accent-hover)] transition-colors"
              style={{ boxShadow: '0 1px 2px rgba(124,58,237,0.30)' }}
            >
              <Plus size={16} />
              New script
            </Link>
          </div>
        </div>

        {scripts.length === 0 && <EmptyState />}

        {/* First-script hero treatment */}
        {heroScript && (
          <HeroCard script={heroScript} isSubscribed={isSubscribed} />
        )}

        {/* Pro upsell — richer value-prop card under the hero, only when
            the free writer has a completed first script. Replaces the slim
            footer banner so the conversion message lands before they
            scroll past. Anuj 2026-04-28. */}
        {heroScript &&
          heroScript.status === 'completed' &&
          !heroScript.isLockedReport &&
          !isSubscribed && <FirstScriptProUpsell />}

        {/* Returning user — compact card list */}
        {scripts.length > 1 && (
          <>
            <div className="flex items-baseline gap-3 mb-4">
              <span className="text-[11px] uppercase tracking-[0.22em] font-bold text-[var(--gem-gray-400)]">
                Your scripts
              </span>
              <span className="flex-1 h-px bg-[var(--gem-gray-700)]" />
            </div>
            <div className="space-y-3">
              {scripts.map((s) => (
                <CompactCard key={s.id} script={s} isSubscribed={isSubscribed} />
              ))}
            </div>
          </>
        )}

        {/* Slim Pro upsell footer — only after the writer has used their
            free eval AND they're past the heroScript single-card view
            (multi-script dashboards). When the heroScript is showing,
            the richer FirstScriptProUpsell sits under the hero instead. */}
        {!isSubscribed && usedFreeEval && !heroScript && (
          <div className="mt-10">
            <FirstScriptProUpsell />
          </div>
        )}
      </div>
    </>
  )
}

// ─── Card components ─────────────────────────────────────────────────

function HeroCard({
  script,
  isSubscribed,
}: {
  script: ScriptSummary
  isSubscribed: boolean
}) {
  const dateStr = new Date(script.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  // Anuj 2026-04-28: time-gated trial removed. Free tier = 1 evaluation,
  // sharable URL, no Industry matching. The conversion gate is on volume
  // (second eval) and industry matching, not on a clock.
  void script.created_at

  if (script.status === 'processing') {
    return (
      <HeroShell title={script.title}>
        <div className="flex flex-col items-center text-center">
          <div
            className="w-9 h-9 mb-5 rounded-full border-[3px] border-[var(--gem-gray-700)] animate-spin"
            style={{ borderTopColor: 'var(--gem-gold)' }}
          />
          <h2 className="text-[22px] font-extrabold m-0 mb-1.5 text-[var(--gem-gray-50)]">
            We&apos;re reading your script
          </h2>
          <p className="text-[14px] text-[var(--gem-gray-400)] m-0 mb-6">
            About a minute.
          </p>
          <ul className="text-left text-[13.5px] text-[var(--gem-gray-300)] space-y-2 max-w-[300px] m-0 p-0 list-none">
            <li className="flex gap-2.5 items-center">
              <span className="w-1 h-1 rounded-full bg-[var(--gem-gray-500)]" />
              You&apos;ll get a full report.
            </li>
            <li className="flex gap-2.5 items-center">
              <span className="w-1 h-1 rounded-full bg-[var(--gem-gray-500)]" />
              Publish to producers.
            </li>
            <li className="flex gap-2.5 items-center">
              <span className="w-1 h-1 rounded-full bg-[var(--gem-gray-500)]" />
              Edit your title, headline, and tags.
            </li>
          </ul>
          <p className="text-[12px] text-[var(--gem-gray-500)] m-0 mt-6">
            Submitted {dateStr}
          </p>
        </div>
      </HeroShell>
    )
  }

  if (script.status === 'awaiting_pdf') {
    return (
      <HeroShell title={script.title}>
        <div className="flex flex-col items-center text-center">
          <h2 className="text-[22px] font-extrabold m-0 mb-1.5 text-[var(--gem-gray-50)]">
            One more step — upload your PDF
          </h2>
          <p className="text-[14px] text-[var(--gem-gray-400)] m-0 mb-6 max-w-[320px]">
            Drop your script in and we&apos;ll have your full report ready in about a minute.
          </p>
          <Link
            href={`/submit?resume=${script.id}${
              script.declared_format
                ? `&format=${encodeURIComponent(script.declared_format)}`
                : ''
            }`}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
            style={{
              background: 'var(--gem-accent)',
              boxShadow: '0 2px 8px rgba(124,58,237,0.25)',
            }}
          >
            <Upload size={14} strokeWidth={2.5} />
            Upload PDF
          </Link>
        </div>
      </HeroShell>
    )
  }

  if (script.status === 'failed') {
    return (
      <HeroShell title={script.title}>
        <div className="flex flex-col items-center text-center">
          <h2 className="text-[22px] font-extrabold m-0 mb-1.5 text-[var(--gem-gray-50)]">
            Something went wrong
          </h2>
          <p className="text-[14px] text-[var(--gem-gray-400)] m-0 mb-5 max-w-[320px]">
            We couldn&apos;t read this PDF. Try uploading a clean text-based version of the script.
          </p>
          <Link
            href="/submit"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
            style={{ background: 'var(--gem-accent)' }}
          >
            Try again
          </Link>
        </div>
      </HeroShell>
    )
  }

  // status === 'completed' from here on.
  if (script.isLockedReport) {
    return (
      <HeroShell title={script.title}>
        <div className="flex flex-col items-center text-center">
          <span
            className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold mb-4"
            style={{
              border: '1px solid rgba(212,160,23,0.4)',
              background: 'rgba(212,160,23,0.10)',
              color: 'var(--gem-gold)',
            }}
          >
            <Lock size={10} /> Upgrade to view
          </span>
          <h2 className="text-[22px] font-extrabold m-0 mb-1.5 text-[var(--gem-gray-50)]">
            Your report is ready
          </h2>
          <p className="text-[14px] text-[var(--gem-gray-400)] m-0 mb-5 max-w-[320px]">
            Pro unlocks the full read for this script and every script after it.
          </p>
          <UnlockTrigger
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
            ariaLabel="Upgrade to view report"
          >
            Upgrade — $20/mo
          </UnlockTrigger>
        </div>
      </HeroShell>
    )
  }

  // Free-tier badge — soft "Free read" indicator (no time pressure). Pro
  // writers don't see it; they're already paid.
  const showFreeBadge = !isSubscribed

  return (
    <HeroShell title={script.title}>
      <div className="flex flex-col items-center text-center">
        {showFreeBadge && (
          <span
            className="inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.18em] font-bold px-2.5 py-1 rounded-full mb-4"
            style={{
              border: '1px solid var(--gem-gold)',
              background: 'rgba(212,160,23,0.06)',
              color: 'var(--gem-gold)',
            }}
          >
            <span
              aria-hidden
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: 'var(--gem-gold)' }}
            />
            Free report · share with anyone
          </span>
        )}
        <h2 className="text-[22px] font-extrabold m-0 mb-1.5 text-[var(--gem-gray-50)]">
          Your report is ready
        </h2>
        {script.positioningHook ? (
          <p className="text-[14px] text-[var(--gem-gray-300)] m-0 mb-5 max-w-[420px] leading-snug">
            {script.positioningHook}
          </p>
        ) : (
          <p className="text-[14px] text-[var(--gem-gray-400)] m-0 mb-5">
            Open the report to see what producers will see.
          </p>
        )}

        {/* Stats strip — Pro writers see live engagement; free writers
            see the same surface, greyed out, with a small "Pro" pill
            next to the heading and the whole block tappable to open
            the upgrade modal. Showing the locked feature (rather than
            hiding it behind a separate upsell pill) lets the writer
            see exactly what they're unlocking. Anuj 2026-04-28. */}
        {script.is_public ? (
          <div className="mb-5 flex flex-col items-center">
            <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gray-500)] m-0 mb-1.5">
              Industry activity
            </p>
            <IndustryActivityButton rows={script.activity} />
          </div>
        ) : showFreeBadge ? (
          <UnlockTrigger
            as="div"
            className="mb-5 inline-flex flex-col items-center cursor-pointer group"
            ariaLabel="Industry matching — upgrade to Pro"
          >
            <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gray-500)] m-0 mb-1.5 inline-flex items-center gap-1.5">
              Industry matching
              <span className="inline-flex items-center gap-1 px-1.5 py-[1px] rounded text-[8.5px] font-bold uppercase tracking-wider text-[var(--gem-gray-500)] bg-white border border-[var(--gem-gray-700)] group-hover:border-[var(--gem-accent)] group-hover:text-[var(--gem-accent)] transition-colors">
                Pro
              </span>
            </p>
            <div
              className="opacity-50 grayscale pointer-events-none select-none"
              aria-hidden
            >
              <IndustryActivityButton rows={script.activity} />
            </div>
          </UnlockTrigger>
        ) : null}

        <div className="flex items-center gap-3 flex-wrap justify-center">
          <Link
            href={`/report/${script.evaluationId}`}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
            style={{
              background: 'var(--gem-accent)',
              boxShadow: '0 2px 8px rgba(124,58,237,0.25)',
            }}
          >
            View report <ArrowRight size={14} />
          </Link>
          {/* Anuj 2026-04-28: Publish/Privacy buttons hidden for free
              writers — both routes land on the Pro-gated privacy panel,
              so the labels were promising actions a free user can't
              actually take. Pro users still get them. */}
          {!script.is_public && !showFreeBadge && (
            <Link
              href={`/report/${script.evaluationId}?privacy=1`}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold text-[var(--gem-gray-50)] border border-[var(--gem-gray-700)] hover:border-[var(--gem-gold)] hover:text-[var(--gem-gold)] transition-colors"
            >
              Publish to producers
            </Link>
          )}
        </div>

        {!script.is_public && !showFreeBadge && (
          <Link
            href={`/report/${script.evaluationId}?privacy=1`}
            className="text-[12px] text-[var(--gem-gray-500)] mt-4 hover:text-[var(--gem-gray-300)] transition-colors"
          >
            Privacy controls
          </Link>
        )}
        {script.is_public && showFreeBadge && (
          <p className="text-[11.5px] text-[var(--gem-gray-500)] m-0 mt-4 max-w-[420px] leading-snug">
            Share the report URL with anyone — your network sees the full read.
            Industry partner matching is on Pro.
          </p>
        )}
        {script.is_public && !showFreeBadge && (
          <p className="text-[12px] text-[var(--gem-gray-500)] m-0 mt-4">
            Visible to industry partners
          </p>
        )}
      </div>
    </HeroShell>
  )
}

// ── First-script Pro upsell ──────────────────────────────────────────
//
// Anuj 2026-04-28: replaces the slim "Ready for unlimited scripts?"
// banner with a richer value-prop card that lands the new pricing
// equation — same $20/mo, more value than before. Sits right under the
// HeroCard so the free writer reads it after their View Report click.

function FirstScriptProUpsell() {
  return (
    <div
      className="rounded-2xl bg-white px-6 sm:px-8 py-6 sm:py-7 mb-6"
      style={{
        border: '1.5px solid var(--gem-accent)',
        background:
          'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(124,58,237,0.02) 65%), #fff',
        boxShadow:
          '0 4px 20px rgba(124,58,237,0.08), 0 1px 4px rgba(0,0,0,0.03)',
      }}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div className="min-w-0">
          <p
            className="text-[10.5px] uppercase tracking-[0.18em] font-bold m-0 mb-1.5"
            style={{ color: 'var(--gem-accent)' }}
          >
            Go Pro · $20/mo
          </p>
          <h3 className="text-[20px] sm:text-[22px] font-extrabold tracking-tight text-[var(--gem-gray-50)] leading-tight m-0 mb-1">
            Unlimited evaluations.<br className="sm:hidden" /> Indefinite industry partner visibility.
          </h3>
          <p className="text-[13.5px] text-[var(--gem-gray-400)] m-0 leading-snug max-w-[60ch]">
            Same price as before — way more in the box. Pro is the new
            screenwriter operating system.
          </p>
        </div>
        <UnlockTrigger
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold bg-[var(--gem-accent)] text-white hover:bg-[var(--gem-accent-hover)] transition-all shrink-0"
          ariaLabel="Upgrade to Pro"
        >
          Upgrade — $20/mo
          <ArrowRight size={14} />
        </UnlockTrigger>
      </div>

      <ul className="grid sm:grid-cols-2 gap-x-5 gap-y-2.5 list-none m-0 p-0">
        <ProUpsellBullet>Unlimited script evaluations</ProUpsellBullet>
        <ProUpsellBullet>Posts stay on Industry indefinitely</ProUpsellBullet>
        <ProUpsellBullet>Submit revisions and rescore old reports</ProUpsellBullet>
        <ProUpsellBullet>Producer intros delivered straight to your inbox</ProUpsellBullet>
        <ProUpsellBullet>Per-section privacy + score-eye toggles</ProUpsellBullet>
        <ProUpsellBullet>Download branded PDFs of every report</ProUpsellBullet>
      </ul>
    </div>
  )
}

function ProUpsellBullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-[13.5px] text-[var(--gem-gray-100)] leading-snug">
      <span
        aria-hidden
        className="inline-flex items-center justify-center rounded-full mt-0.5 shrink-0"
        style={{
          width: 16,
          height: 16,
          background: 'rgba(124,58,237,0.10)',
          color: 'var(--gem-accent)',
        }}
      >
        <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
          <path
            d="M2 4.5L4 6.5L7.5 2.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span>{children}</span>
    </li>
  )
}

function HeroShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl bg-white px-6 sm:px-10 py-10 sm:py-12 mb-6"
      style={{
        border: '1px solid var(--gem-gray-700)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.03)',
      }}
    >
      <p className="text-[11px] uppercase tracking-[0.22em] font-bold text-[var(--gem-gray-400)] text-center m-0 mb-2">
        {title}
      </p>
      {children}
    </div>
  )
}

function CompactCard({
  script,
  isSubscribed,
}: {
  script: ScriptSummary
  isSubscribed: boolean
}) {
  const dateStr = new Date(script.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  // Status pill — color-coded to the script's current state. Order matters
  // (failed > processing > awaiting_pdf > locked > public > private).
  let statusLabel: { text: string; color: string; bg: string; border: string } | null = null
  if (script.status === 'failed') {
    statusLabel = {
      text: 'Failed',
      color: '#dc2626',
      bg: 'rgba(220,38,38,0.08)',
      border: 'rgba(220,38,38,0.30)',
    }
  } else if (script.status === 'processing') {
    statusLabel = {
      text: 'Processing',
      color: 'var(--gem-warning)',
      bg: 'rgba(217,119,6,0.10)',
      border: 'rgba(217,119,6,0.35)',
    }
  } else if (script.status === 'awaiting_pdf') {
    statusLabel = {
      text: 'Draft — needs PDF',
      color: 'var(--gem-gold)',
      bg: 'rgba(212,160,23,0.10)',
      border: 'rgba(212,160,23,0.4)',
    }
  } else if (script.isLockedReport) {
    statusLabel = {
      text: 'Upgrade to view',
      color: 'var(--gem-gold)',
      bg: 'rgba(212,160,23,0.10)',
      border: 'rgba(212,160,23,0.4)',
    }
  } else if (script.is_public) {
    statusLabel = {
      text: 'Visible to industry partners',
      color: '#059669',
      bg: 'rgba(16,185,129,0.10)',
      border: 'rgba(16,185,129,0.35)',
    }
  } else if (script.hasReport) {
    statusLabel = {
      text: 'Unpublished',
      color: 'var(--gem-gray-500)',
      bg: 'transparent',
      border: 'var(--gem-gray-700)',
    }
  }

  // Primary action varies by state. Slim sizing to match the trimmer card.
  let action: React.ReactNode = null
  if (script.status === 'awaiting_pdf') {
    action = (
      <Link
        href={`/submit?resume=${script.id}${
          script.declared_format
            ? `&format=${encodeURIComponent(script.declared_format)}`
            : ''
        }`}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12.5px] font-semibold text-white"
        style={{ background: 'var(--gem-accent)' }}
      >
        <Upload size={12} /> Upload PDF
      </Link>
    )
  } else if (script.isLockedReport) {
    action = (
      <UnlockTrigger
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12.5px] font-semibold text-white"
        ariaLabel="Upgrade to view"
      >
        Upgrade — $20/mo
      </UnlockTrigger>
    )
  } else if (script.hasReport && script.evaluationId) {
    action = (
      <Link
        href={`/report/${script.evaluationId}`}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12.5px] font-semibold text-white"
        style={{ background: 'var(--gem-accent)' }}
      >
        View <ArrowRight size={12} />
      </Link>
    )
  }

  // Format label — Feature vs Series. Anuj 2026-04-27: helps the writer
  // tell two scripts on the same story apart. Inlined into the metadata
  // line below the title rather than rendered as a chip up top.
  const formatLabel =
    script.declared_format === 'Series'
      ? 'Series'
      : script.declared_format === 'Feature film'
        ? 'Feature'
        : null

  // Show stats inline whenever there's a report — even on locked
  // (free-tier 2nd+) cards. Surfacing the stats is the carrot ("3
  // producers viewed — upgrade to keep your post live"). Anuj
  // 2026-04-28.
  const showActivity = script.hasReport
  // Owner-actions menu (3-dot) only on cards where the owner has
  // unlocked access — the locked card's primary CTA is the upgrade
  // button so the menu would compete.
  const showOwnerActions = script.hasReport && !script.isLockedReport

  return (
    <div
      className="rounded-xl bg-white px-4 sm:px-5 py-3 sm:py-3.5"
      style={{
        border: '1px solid var(--gem-gray-700)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      }}
    >
      {/* Row 1 — status pill in the top-right corner. When the pill
          represents a publish/unpublish state ("Visible to industry" or
          "Unpublished"), the pill itself becomes the trigger that opens
          the privacy modal — one-click publish/unpublish from the card.
          For non-toggleable states (Failed, Processing, Awaiting PDF,
          Upgrade to view) the pill stays static.
          Anuj 2026-04-28: removes the awkward standalone privacy row;
          the pill now does double duty as status + control. */}
      <div className="flex justify-end min-h-[20px] mb-0.5">
        {statusLabel && (
          script.hasReport && !script.isLockedReport ? (
            <DashboardPrivacyButton
              submissionId={script.id}
              initialPrivacy={script.reportPrivacy}
              initialIsPublic={script.is_public}
              isProSubscriber={isSubscribed}
              triggerLabel={statusLabel.text}
              triggerVariant="status-pill"
              statusPillStyle={{
                color: statusLabel.color,
                bg: statusLabel.bg,
                border: statusLabel.border,
              }}
            />
          ) : (
            <span
              className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
              style={{
                border: `1px solid ${statusLabel.border}`,
                background: statusLabel.bg,
                color: statusLabel.color,
              }}
            >
              {script.status === 'processing' && (
                <span
                  aria-hidden
                  className="inline-block w-2 h-2 rounded-full border border-current border-t-transparent animate-spin"
                />
              )}
              {statusLabel.text}
            </span>
          )
        )}
      </div>

      {/* Row 2 — title. */}
      <h3 className="text-[15px] sm:text-[16px] font-semibold text-[var(--gem-gray-50)] leading-tight m-0 truncate">
        {script.title}
      </h3>

      {/* Row 3 — format · date. */}
      <p className="text-[11.5px] text-[var(--gem-gray-500)] m-0 mt-0.5">
        {formatLabel}
        {formatLabel && ' · '}
        {dateStr}
      </p>

      {/* Row 4 — industry stats on the left, action buttons on the right.
          Free writers see the same stats block, but greyed out, with a
          small "Pro" pill next to the heading — tapping anywhere fires
          the upgrade modal. Showing the same surface (instead of a
          separate "Get matched" pill) keeps the carrot honest: this is
          the engagement view they unlock with Pro. Anuj 2026-04-28. */}
      <div className="flex items-end justify-between gap-3 flex-wrap mt-3">
        <div className="min-w-0">
          {showActivity ? (
            isSubscribed ? (
              <>
                <p className="text-[10px] uppercase tracking-[0.14em] font-bold text-[var(--gem-gray-500)] m-0 mb-1">
                  Industry activity
                </p>
                <IndustryActivityButton rows={script.activity} />
              </>
            ) : (
              <UnlockTrigger
                as="div"
                className="inline-flex flex-col items-start gap-1 cursor-pointer group"
                ariaLabel="Industry matching — upgrade to Pro"
              >
                <p className="text-[10px] uppercase tracking-[0.14em] font-bold text-[var(--gem-gray-500)] m-0 inline-flex items-center gap-1.5">
                  Industry matching
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-[1px] rounded text-[8.5px] font-bold uppercase tracking-wider text-[var(--gem-gray-500)] bg-white border border-[var(--gem-gray-700)] group-hover:border-[var(--gem-accent)] group-hover:text-[var(--gem-accent)] transition-colors"
                  >
                    Pro
                  </span>
                </p>
                <div
                  className="opacity-50 grayscale pointer-events-none select-none"
                  aria-hidden
                >
                  <IndustryActivityButton rows={script.activity} />
                </div>
              </UnlockTrigger>
            )
          ) : (
            <span aria-hidden />
          )}
        </div>
        <div className="shrink-0 flex items-center gap-1.5 sm:gap-2">
          {showOwnerActions && script.evaluationId && (
            // 3-dot actions menu — Edit (links to report page), Download,
            // Submit revision, Remove. Activity is intentionally omitted
            // here because the dashboard already shows it inline at left
            // (no point listing it twice). Privacy lives on the top-right
            // status pill now. Anuj 2026-04-28.
            <OwnerActionsMenu
              submissionId={script.id}
              evaluationId={script.evaluationId}
              title={script.title}
              declaredFormat={
                script.declared_format === 'Feature film' ||
                script.declared_format === 'Series'
                  ? script.declared_format
                  : null
              }
              isSubscribed={isSubscribed}
              editHref={`/report/${script.evaluationId}`}
              downloadHref={`/report/${script.evaluationId}?download=1`}
            />
          )}
          {action}
        </div>
      </div>
    </div>
  )
}

// Top-of-dashboard upsell shown to free writers on their very first
// script. Replaces the soft "you're signed up" banner with a banner
// that does the upgrade pitch when the writer has the most attention to
// give. Anuj 2026-04-28.
function FirstScriptUpsellBanner() {
  return (
    <div
      className="mb-6 rounded-xl px-4 py-3 flex items-start gap-3"
      style={{
        background: 'rgba(124,58,237,0.06)',
        border: '1px solid rgba(124,58,237,0.25)',
      }}
    >
      <span
        className="text-[15px] leading-none mt-0.5"
        style={{ color: 'var(--gem-accent)' }}
      >
        ✦
      </span>
      <div className="flex-1 min-w-0 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[14px] text-[var(--gem-gray-100)] leading-snug m-0">
          Your free evaluation is ready. Upgrade to Pro for unlimited reports
          plus direct publishing to industry partners.
        </p>
        <UnlockTrigger
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12.5px] font-semibold text-white shrink-0 bg-[var(--gem-accent)] hover:bg-[var(--gem-accent-hover)] transition-colors"
          ariaLabel="Upgrade to Pro"
        >
          Upgrade — $20/mo
        </UnlockTrigger>
      </div>
    </div>
  )
}

function WelcomeBanner({
  welcomeBack,
  justDraftSaved,
  justSignedUp,
  firstName,
}: {
  welcomeBack: boolean
  justDraftSaved: boolean
  justSignedUp: boolean
  firstName: string
}) {
  return (
    <div
      className="mb-6 rounded-xl px-4 py-3 flex items-start gap-3"
      style={{
        background: welcomeBack ? 'rgba(124,58,237,0.06)' : 'rgba(212,160,23,0.07)',
        border: welcomeBack
          ? '1px solid rgba(124,58,237,0.25)'
          : '1px solid rgba(212,160,23,0.30)',
      }}
    >
      <span
        className="text-[15px] leading-none mt-0.5"
        style={{ color: welcomeBack ? 'var(--gem-accent)' : 'var(--gem-gold)' }}
      >
        ✦
      </span>
      <p className="text-[14px] text-[var(--gem-gray-100)] leading-snug m-0">
        {welcomeBack && justDraftSaved && (
          <>
            Welcome back, {firstName} — we&apos;ve added this draft to your existing
            account. Drop in your PDF anytime to score it.
          </>
        )}
        {welcomeBack && justSignedUp && (
          <>Welcome back, {firstName} — your new script has been added to your account.</>
        )}
        {welcomeBack && !justDraftSaved && !justSignedUp && (
          <>Welcome back, {firstName}.</>
        )}
        {!welcomeBack && justDraftSaved && (
          <>Your draft is saved. Drop in your PDF anytime to unlock your full GEM read.</>
        )}
        {!welcomeBack && justSignedUp && (
          <>You&apos;re signed up — your script is being scored.</>
        )}
      </p>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-20 border border-dashed border-[var(--gem-gray-700)] rounded-xl bg-white">
      <FileText size={32} className="mx-auto text-[var(--gem-gray-500)] mb-3" />
      <p className="text-[var(--gem-gray-400)] text-sm mb-4">No scripts yet.</p>
      <Link
        href="/submit"
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm bg-[var(--gem-accent)] text-white hover:bg-[var(--gem-accent-hover)] transition-colors"
      >
        Submit your first script <ArrowRight size={14} />
      </Link>
    </div>
  )
}
