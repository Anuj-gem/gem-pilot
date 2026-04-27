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
    .select('subscription_status, full_name')
    .eq('id', user.id)
    .single()

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

    // Producer profile lookup for name + company.
    const producerIds = Array.from(new Set(rawRows.map((r) => r.producer_id)))
    const producerInfo = new Map<
      string,
      { full_name: string | null; email: string | null; company_name: string | null }
    >()
    if (producerIds.length > 0) {
      const { data: producers } = await supabase
        .from('profiles')
        .select('id, full_name, email, company_name')
        .in('id', producerIds)
      for (const p of (producers ?? []) as any[]) {
        producerInfo.set(p.id, {
          full_name: p.full_name ?? null,
          email: p.email ?? null,
          company_name: p.company_name ?? null,
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
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-10">
        {(welcomeBack || justDraftSaved || justSignedUp) && (
          <WelcomeBanner
            welcomeBack={welcomeBack}
            justDraftSaved={justDraftSaved}
            justSignedUp={justSignedUp}
            firstName={firstName}
          />
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
          <Link
            href="/submit"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold bg-[var(--gem-accent)] text-white hover:bg-[var(--gem-accent-hover)] transition-colors shrink-0"
            style={{ boxShadow: '0 1px 2px rgba(124,58,237,0.30)' }}
          >
            <Plus size={16} />
            New script
          </Link>
        </div>

        {scripts.length === 0 && <EmptyState />}

        {/* First-script hero treatment */}
        {heroScript && <HeroCard script={heroScript} />}

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
                <CompactCard key={s.id} script={s} />
              ))}
            </div>
          </>
        )}

        {/* Slim Pro upsell footer — only after the writer has used their
            free eval. The Pro upsell card with multiple bullets is gone;
            this single inline banner is enough nudge for repeat visits. */}
        {!isSubscribed && usedFreeEval && (
          <div
            className="mt-10 rounded-xl border border-[var(--gem-gray-700)] p-5 sm:p-6 bg-white flex items-center justify-between gap-4 flex-wrap"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}
          >
            <div>
              <p className="text-sm font-semibold text-[var(--gem-gray-50)] m-0 mb-1">
                Ready for unlimited scripts?
              </p>
              <p className="text-sm text-[var(--gem-gray-400)] m-0">
                Pro unlocks unlimited evaluations and lets producers reach you directly.
              </p>
            </div>
            <UnlockTrigger
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-[var(--gem-accent)] text-white hover:bg-[var(--gem-accent-hover)] transition-all"
              ariaLabel="Upgrade to Pro"
            >
              Go Pro — $20/mo
            </UnlockTrigger>
          </div>
        )}
      </div>
    </>
  )
}

// ─── Card components ─────────────────────────────────────────────────

function HeroCard({ script }: { script: ScriptSummary }) {
  const dateStr = new Date(script.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

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

  // Completed and viewable. Two sub-states inside the hero: not-yet-public
  // (publish CTA visible) vs already public (visibility line + interested
  // count).
  return (
    <HeroShell title={script.title}>
      <div className="flex flex-col items-center text-center">
        <h2 className="text-[22px] font-extrabold m-0 mb-1.5 text-[var(--gem-gray-50)]">
          Your report is ready
        </h2>
        {script.positioningHook ? (
          <p className="text-[14px] text-[var(--gem-gray-300)] m-0 mb-6 max-w-[420px] leading-snug">
            {script.positioningHook}
          </p>
        ) : (
          <p className="text-[14px] text-[var(--gem-gray-400)] m-0 mb-6">
            Open the report to see what producers will see.
          </p>
        )}
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
          {!script.is_public && (
            <Link
              href={`/report/${script.evaluationId}?privacy=1`}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold text-[var(--gem-gray-50)] border border-[var(--gem-gray-700)] hover:border-[var(--gem-gold)] hover:text-[var(--gem-gold)] transition-colors"
            >
              Publish to producers
            </Link>
          )}
        </div>
        {!script.is_public && (
          <Link
            href={`/report/${script.evaluationId}?privacy=1`}
            className="text-[12px] text-[var(--gem-gray-500)] mt-4 hover:text-[var(--gem-gray-300)] transition-colors"
          >
            Privacy controls
          </Link>
        )}
        {script.is_public && (
          <p className="text-[12px] text-[var(--gem-gray-500)] m-0 mt-4">
            Visible to producers
            {script.interestedCount > 0 && (
              <>
                <span className="mx-1.5">·</span>
                <span className="font-semibold" style={{ color: '#059669' }}>
                  {script.interestedCount} interested
                </span>
              </>
            )}
          </p>
        )}
      </div>
    </HeroShell>
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

function CompactCard({ script }: { script: ScriptSummary }) {
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
      text: 'Visible to industry',
      color: '#059669',
      bg: 'rgba(16,185,129,0.10)',
      border: 'rgba(16,185,129,0.35)',
    }
  } else if (script.hasReport) {
    statusLabel = {
      text: 'Private',
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

  // Format pill — Feature vs Series. Anuj 2026-04-27: this is the only
  // metadata that's load-bearing for a writer scanning their own list
  // (lets them tell two scripts on the same idea apart). Genre / tone /
  // headline noise was dropped to keep cards small + scannable on mobile.
  const formatPill =
    script.declared_format === 'Series'
      ? 'Series'
      : script.declared_format === 'Feature film'
        ? 'Feature'
        : null

  return (
    <div
      className="rounded-xl bg-white px-4 sm:px-5 py-3 sm:py-3.5 flex items-center gap-3 flex-wrap"
      style={{
        border: '1px solid var(--gem-gray-700)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <h3 className="text-[14.5px] sm:text-[15.5px] font-semibold text-[var(--gem-gray-50)] leading-tight m-0 truncate">
            {script.title}
          </h3>
          {formatPill && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{
                border: '1px solid var(--gem-gray-700)',
                color: 'var(--gem-gray-500)',
                background: 'transparent',
              }}
            >
              {formatPill}
            </span>
          )}
          {statusLabel && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
              style={{
                border: `1px solid ${statusLabel.border}`,
                background: statusLabel.bg,
                color: statusLabel.color,
              }}
            >
              {statusLabel.text}
            </span>
          )}
          {script.interestedCount > 0 && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
              style={{
                border: '1px solid rgba(16,185,129,0.35)',
                background: 'rgba(16,185,129,0.10)',
                color: '#059669',
              }}
            >
              {script.interestedCount} interested
            </span>
          )}
        </div>
        <p className="text-[11px] text-[var(--gem-gray-500)] m-0">
          {dateStr}
        </p>
      </div>
      <div className="shrink-0 flex items-center gap-1.5 sm:gap-2 flex-wrap">
        {script.hasReport && !script.isLockedReport && (
          <>
            <IndustryActivityButton rows={script.activity} />
            <DashboardPrivacyButton
              submissionId={script.id}
              initialPrivacy={script.reportPrivacy}
              initialIsPublic={script.is_public}
            />
          </>
        )}
        {action}
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
