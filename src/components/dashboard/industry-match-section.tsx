'use client'

// Industry Activity — collapsible sub-section that hangs off each writer
// script card. Renders the script_matches rows for that submission, sorted
// by status priority, with an optional "Send new draft" CTA on Interested
// rows. Pro writers get the active CTA; free writers get a paywalled
// version that dispatches `gem:open-upgrade-modal` instead of routing.
//
// The shape of the `matches` prop is whatever the dashboard server page
// hands us — a normalized row per match plus a denormalized producer label
// + lane summary so this component doesn't need to do any DB work.
//
// Above the activity rows we render a small Opportunities checklist —
// currently a single "Posted to industry" step that flips `is_public` on
// click (or fires the upgrade modal for free writers). Until the script is
// posted to industry, the activity rows below are dimmed with a small
// nudge — we still show what's been happening, but make it clear the
// writer hasn't opened the door yet.

import { useRouter } from 'next/navigation'
import { Check, ChevronDown, Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { UnmatchButton } from './unmatch-button'

export type MatchStatus =
  | 'pending'
  | 'opened'
  | 'interested'
  | 'passed'
  | 'commented'

export interface DashboardMatch {
  id: string
  status: MatchStatus
  partnerLabel: string // generic role label — "Producer" / "Lit rep" pre-Interested
  producerName: string | null // real name, only filled in once Interested+
  producerEmail: string | null // real email, only filled in once Interested+
  scriptTitle: string | null // historical: was used for mailto subjects, kept for context
  laneSummary: string // truncated "Looking for ..." text
  comment: string | null
  createdAt: string // ISO
  openedAt: string | null
  reactedAt: string | null
  expiresAt: string | null
  unmatchedAt: string | null
  producerEmailedAt: string | null // first time the producer clicked "Email writer"
}

const STATUS_PRIORITY: Record<MatchStatus, number> = {
  interested: 0,
  commented: 1,
  opened: 2,
  pending: 3,
  passed: 4,
}

// Dashboard now shows passed matches ONLY when the producer left a comment
// (otherwise it's noise). Pending rows are filtered server-side and never
// reach this component, so they're ignored everywhere below.
function isVisiblePassed(m: DashboardMatch): boolean {
  return m.status === 'passed' && (m.comment ?? '').trim().length > 0
}

function fmtShortDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function StatusPill({ status }: { status: MatchStatus }) {
  if (status === 'interested' || status === 'commented') {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.10em] rounded-full px-2.5 py-1 whitespace-nowrap self-start"
        style={{
          color: '#fff',
          background: 'var(--gem-success)',
          border: '1px solid var(--gem-success)',
          boxShadow: '0 1px 2px rgba(22,163,74,0.25)',
        }}
      >
        <span
          aria-hidden
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{
            background: '#fff',
            boxShadow: '0 0 0 3px rgba(255,255,255,0.4)',
          }}
        />
        {status === 'commented' ? 'Interested · replied' : 'Interested'}
      </span>
    )
  }
  if (status === 'opened') {
    // "Opened" is renamed "Viewed" — gray pill, less prominent than the
    // Interested pills above. The producer cracked the report but hasn't
    // committed either way yet.
    return (
      <span
        className="inline-flex items-center text-[11px] font-semibold uppercase tracking-[0.10em] rounded-full px-2.5 py-1 whitespace-nowrap self-start"
        style={{
          color: 'var(--gem-gray-400)',
          background: 'var(--gem-gray-900)',
          border: '1px solid var(--gem-gray-700)',
        }}
      >
        Viewed
      </span>
    )
  }
  // 'passed' — only rendered when the producer left a comment (the
  // isVisiblePassed gate filters silent passes out upstream). Dimmed so it
  // reads as historical context, not active activity.
  return (
    <span
      className="inline-flex items-center text-[11px] font-semibold uppercase tracking-[0.10em] rounded-full px-2.5 py-1 whitespace-nowrap self-start"
      style={{
        color: 'var(--gem-gray-500)',
        background: 'var(--gem-gray-900)',
        border: '1px solid var(--gem-gray-700)',
        opacity: 0.85,
      }}
    >
      Passed
    </span>
  )
}

function SendDraftButton({
  matchId,
  isSubscribed,
}: {
  matchId: string
  isSubscribed: boolean
}) {
  const router = useRouter()

  function handleClick() {
    if (isSubscribed) {
      router.push(`/submit?reply_to_match=${encodeURIComponent(matchId)}`)
      return
    }
    window.dispatchEvent(new CustomEvent('gem:open-upgrade-modal'))
  }

  if (isSubscribed) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold rounded-lg px-3.5 py-2 transition-all duration-150 hover:brightness-110 active:scale-[0.97]"
        style={{
          background: 'var(--gem-accent)',
          color: '#fff',
          boxShadow: '0 1px 2px rgba(124,58,237,0.25)',
        }}
      >
        Send new draft <span aria-hidden>→</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title="Pro unlocks unlimited drafts"
      className="inline-flex items-center gap-1.5 text-[13px] font-semibold rounded-lg px-3.5 py-2 transition-all duration-150 hover:brightness-105 active:scale-[0.97]"
      style={{
        background: 'transparent',
        color: 'var(--gem-accent)',
        border: '1px solid var(--gem-accent)',
      }}
    >
      Send new draft <span className="opacity-75">· Pro</span>
    </button>
  )
}

function MatchRow({
  match,
  isSubscribed,
}: {
  match: DashboardMatch
  isSubscribed: boolean
}) {
  const interested = match.status === 'interested' || match.status === 'commented'
  const dateStr = fmtShortDate(match.createdAt)

  let metaTail: string | null = null
  if (match.status === 'opened' && match.expiresAt) {
    const exp = fmtShortDate(match.expiresAt)
    if (exp) metaTail = `Viewed your full report. Auto-passes ${exp}.`
  } else if (match.status === 'opened') {
    metaTail = 'Viewed your full report.'
  }

  // Identity reveal: pre-Interested rows stay anonymous (generic role label).
  // Once the producer marks Interested/Commented, we show their real name —
  // it's the central trust handshake of the two-sided flow. Email is shown
  // alongside the name in the same gate so the writer can reach back out.
  const headerLabel =
    interested && match.producerName ? match.producerName : match.partnerLabel

  return (
    <div
      className="rounded-xl px-5 py-4 grid items-start"
      style={{
        gridTemplateColumns: '1fr auto',
        columnGap: '20px',
        rowGap: '8px',
        background: interested
          ? 'linear-gradient(135deg, rgba(22,163,74,0.04), transparent 60%), #fff'
          : '#fff',
        border: interested
          ? '1px solid rgba(22,163,74,0.35)'
          : '1px solid var(--gem-gray-700)',
        boxShadow: interested ? '0 0 0 3px rgba(22,163,74,0.05)' : undefined,
      }}
    >
      <div className="min-w-0">
        <div className="text-[14px] sm:text-[15px] font-bold text-[var(--gem-gray-50)] leading-snug tracking-tight">
          {headerLabel}
          {match.laneSummary ? (
            <>
              <span className="text-[var(--gem-gray-500)] font-normal mx-1.5">·</span>
              <span className="font-semibold">{match.laneSummary}</span>
            </>
          ) : null}
        </div>
        {interested && match.producerEmail && (
          <div
            className="text-[12px] text-[var(--gem-gray-400)] mt-0.5 truncate"
            style={{
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            }}
          >
            {match.producerEmail}
          </div>
        )}
        <div className="flex items-center gap-2 text-[12.5px] text-[var(--gem-gray-400)] mt-1">
          {dateStr && <span>{dateStr}</span>}
          {dateStr && metaTail && (
            <span className="text-[var(--gem-gray-500)]">·</span>
          )}
          {metaTail && <span>{metaTail}</span>}
        </div>
      </div>

      <div className="flex items-center gap-2 self-start">
        <StatusPill status={match.status} />
      </div>

      {match.comment && match.status === 'passed' ? (
        // Pass comments: dashboard fills `producerName` for passed-with-comment
        // rows so we can attribute the quote to a real person. Email stays
        // gated to Interested+ so a pass doesn't open an inbound channel.
        <div
          className="text-[13.5px] leading-snug"
          style={{
            gridColumn: '1 / 3',
            marginTop: '4px',
            color: 'var(--gem-gray-300)',
          }}
        >
          <span className="font-semibold text-[var(--gem-gray-200)]">
            {match.producerName ?? match.partnerLabel} passed:
          </span>{' '}
          <span className="italic">&ldquo;{match.comment}&rdquo;</span>
        </div>
      ) : match.comment ? (
        <div
          className="text-[13.5px] leading-snug"
          style={{
            gridColumn: '1 / 3',
            marginTop: '4px',
            color: interested ? '#15803d' : 'var(--gem-gray-200)',
            fontWeight: interested ? 500 : 400,
          }}
        >
          &ldquo;{match.comment}&rdquo;
        </div>
      ) : null}

      {interested && (
        <div
          className="flex items-center justify-end gap-2 flex-wrap"
          style={{ gridColumn: '1 / 3', marginTop: '4px' }}
        >
          <UnmatchButton matchId={match.id} />
          <SendDraftButton matchId={match.id} isSubscribed={isSubscribed} />
        </div>
      )}
    </div>
  )
}

export function IndustryMatchSection({
  matches,
  isSubscribed,
  isPublic,
  submissionId,
}: {
  matches: DashboardMatch[]
  isSubscribed: boolean
  /** Whether the script's report is published to industry partners. Drives
   *  the Opportunities checklist row + dims the activity list while false. */
  isPublic: boolean
  /** Used by the inline "post to industry" action to flip is_public via
   *  /api/scripts/[id]/visibility. */
  submissionId: string
}) {
  const [showPassedComments, setShowPassedComments] = useState(false)
  const [open, setOpen] = useState(true)

  const sorted = useMemo(() => {
    return [...matches].sort((a, b) => {
      const pa = STATUS_PRIORITY[a.status] ?? 99
      const pb = STATUS_PRIORITY[b.status] ?? 99
      if (pa !== pb) return pa - pb
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [matches])

  // Visible passed = passes that include a comment (silent passes are noise
  // and stay hidden). They're tucked behind a disclosure so the live
  // Viewed/Interested rows stay above the fold.
  const visiblePassed = useMemo(
    () => sorted.filter(isVisiblePassed),
    [sorted]
  )
  const passedWithCommentCount = visiblePassed.length
  const visible = useMemo(
    () =>
      sorted.filter(m => {
        if (m.status === 'passed') {
          // Silent passes never appear; passes with comments only appear
          // once the writer has expanded the disclosure.
          return showPassedComments && isVisiblePassed(m)
        }
        return true
      }),
    [sorted, showPassedComments]
  )
  // Active = anything not passed. Pending is filtered out server-side, so
  // this collapses to viewed + interested + commented.
  const activeCount = sorted.filter(m => m.status !== 'passed').length
  // Producers who actually clicked through to email the writer. Read off
  // each match's producer_emailed_at timestamp; only render if > 0.
  const emailedCount = sorted.filter(m => !!m.producerEmailedAt).length

  return (
    <div
      className="border-t"
      style={{
        borderColor: 'var(--gem-gray-700)',
        background: 'var(--gem-gray-900)',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-6 sm:px-8 py-3.5 text-left cursor-pointer"
        aria-expanded={open}
      >
        <span className="text-[11.5px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gray-200)]">
          Industry activity
        </span>
        {matches.length > 0 && (
          <span className="text-[12.5px] text-[var(--gem-gray-400)] font-medium">
            {activeCount} active
          </span>
        )}
        <ChevronDown
          size={16}
          className="ml-auto text-[var(--gem-gray-400)] transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : undefined }}
        />
      </button>

      {open && (
        <div className="px-6 sm:px-8 pb-5 pt-1 flex flex-col gap-3">
          {/* Opportunities checklist — single step today (post to industry).
              Sits above the activity list so the writer always sees the
              gating action before any of the rows below. */}
          <OpportunitiesChecklist
            isPublic={isPublic}
            isSubscribed={isSubscribed}
            submissionId={submissionId}
          />

          {matches.length === 0 ? (
            <p className="text-[13.5px] text-[var(--gem-gray-400)] m-0 leading-snug">
              {isPublic
                ? 'Awaiting first signal — producers in your lane will land here as they engage.'
                : 'Once your script is visible to industry, producer activity will land here.'}
            </p>
          ) : (
            <div
              className="flex flex-col gap-2.5"
              style={{
                opacity: isPublic ? 1 : 0.55,
                pointerEvents: isPublic ? undefined : 'none',
              }}
              aria-disabled={!isPublic}
            >
              {!isPublic && (
                <p className="text-[12.5px] text-[var(--gem-gray-500)] italic m-0 -mb-0.5">
                  This script isn&apos;t visible to industry yet — make it visible to start matching.
                </p>
              )}
              {emailedCount > 0 && (
                <div
                  className="rounded-lg px-3.5 py-2 text-[12.5px] font-semibold leading-snug self-start"
                  style={{
                    background: 'rgba(124,58,237,0.08)',
                    border: '1px solid rgba(124,58,237,0.25)',
                    color: 'var(--gem-accent)',
                  }}
                >
                  {emailedCount} producer{emailedCount === 1 ? ' has' : 's have'} reached out via email
                </div>
              )}
              {visible.map(m => (
                <MatchRow key={m.id} match={m} isSubscribed={isSubscribed} />
              ))}
              {passedWithCommentCount > 0 && !showPassedComments && (
                <button
                  type="button"
                  onClick={() => setShowPassedComments(true)}
                  className="rounded-lg py-2.5 px-4 text-[13px] font-medium text-[var(--gem-gray-400)] hover:text-[var(--gem-gray-200)] transition-colors"
                  style={{
                    border: '1px dashed var(--gem-gray-600)',
                    background: 'transparent',
                  }}
                >
                  + {passedWithCommentCount} producer{passedWithCommentCount === 1 ? '' : 's'} passed with feedback
                </button>
              )}
              {passedWithCommentCount > 0 && showPassedComments && (
                <button
                  type="button"
                  onClick={() => setShowPassedComments(false)}
                  className="text-[12.5px] text-[var(--gem-gray-500)] hover:text-[var(--gem-gray-300)] self-center transition-colors"
                >
                  Hide pass feedback
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// OpportunitiesChecklist — minimal one-step list today. When the script
// isn't public, surfaces a "Make visible to industry partners" CTA that
// flips is_public via the existing PATCH /api/scripts/[id]/visibility
// route. Free writers are routed to the upgrade modal instead — same gate
// the API enforces server-side, surfaced earlier so they don't see a 403.
function OpportunitiesChecklist({
  isPublic,
  isSubscribed,
  submissionId,
}: {
  isPublic: boolean
  isSubscribed: boolean
  submissionId: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function makeVisible() {
    if (!isSubscribed) {
      window.dispatchEvent(new CustomEvent('gem:open-upgrade-modal'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/scripts/${encodeURIComponent(submissionId)}/visibility`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_public: true }),
        }
      )
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Could not publish.')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setBusy(false)
    }
  }

  if (isPublic) {
    return (
      <div
        className="flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 self-start"
        style={{
          border: '1px solid rgba(16,185,129,0.30)',
          background: 'rgba(16,185,129,0.06)',
        }}
      >
        <span
          className="inline-flex items-center justify-center w-4 h-4 rounded-full shrink-0"
          style={{ background: 'var(--gem-success)' }}
          aria-hidden
        >
          <Check size={11} strokeWidth={3} color="#fff" />
        </span>
        <span className="text-[13px] font-semibold text-[#15803d]">
          Visible to industry partners
        </span>
      </div>
    )
  }

  return (
    <div
      className="rounded-lg px-3.5 py-3 flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3"
      style={{
        border: '1px solid var(--gem-gray-700)',
        background: '#fff',
      }}
    >
      <span
        className="inline-flex items-center gap-2 text-[13px] font-semibold text-[var(--gem-gray-100)] min-w-0"
      >
        <span
          className="inline-flex items-center justify-center w-4 h-4 rounded-full shrink-0"
          style={{ border: '1.5px solid var(--gem-gray-500)' }}
          aria-hidden
        />
        Posted to industry
      </span>
      <div className="sm:ml-auto flex items-center gap-2">
        {error && (
          <span className="text-[12px] text-red-600">{error}</span>
        )}
        <button
          type="button"
          onClick={makeVisible}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg text-[12.5px] font-semibold px-3 py-1.5 transition-all duration-150 disabled:opacity-60"
          style={{
            background: 'var(--gem-accent)',
            color: '#fff',
            boxShadow: '0 1px 2px rgba(124,58,237,0.25)',
          }}
        >
          {busy && <Loader2 size={12} className="animate-spin" />}
          {isSubscribed
            ? 'Make visible to industry partners'
            : 'Make visible to industry partners — Pro'}
        </button>
      </div>
    </div>
  )
}
