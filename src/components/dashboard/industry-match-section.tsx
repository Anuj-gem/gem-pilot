'use client'

// Industry Match — collapsible sub-section that hangs off each writer
// script card. Renders the script_matches rows for that submission, sorted
// by status priority, with an optional "Send new draft" CTA on Interested
// rows. Pro writers get the active CTA; free writers get a paywalled
// version that dispatches `gem:open-upgrade-modal` instead of routing.
//
// The shape of the `matches` prop is whatever the dashboard server page
// hands us — a normalized row per match plus a denormalized producer label
// + lane summary so this component doesn't need to do any DB work.

import { useRouter } from 'next/navigation'
import { ChevronDown, Mail } from 'lucide-react'
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
  scriptTitle: string | null // used to build the "Reply via email" subject line
  laneSummary: string // truncated "Looking for ..." text
  comment: string | null
  createdAt: string // ISO
  openedAt: string | null
  reactedAt: string | null
  expiresAt: string | null
  unmatchedAt: string | null
}

const STATUS_PRIORITY: Record<MatchStatus, number> = {
  interested: 0,
  commented: 1,
  opened: 2,
  pending: 3,
  passed: 4,
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
        {status === 'commented' ? 'Replied' : 'Interested'}
      </span>
    )
  }
  if (status === 'pending') {
    return (
      <span
        className="inline-flex items-center text-[11px] font-bold uppercase tracking-[0.10em] rounded-full px-2.5 py-1 whitespace-nowrap self-start"
        style={{
          color: 'var(--gem-warning)',
          background: 'rgba(217,119,6,0.08)',
          border: '1px solid rgba(217,119,6,0.30)',
        }}
      >
        Pending
      </span>
    )
  }
  if (status === 'opened') {
    return (
      <span
        className="inline-flex items-center text-[11px] font-bold uppercase tracking-[0.10em] rounded-full px-2.5 py-1 whitespace-nowrap self-start"
        style={{
          color: 'var(--gem-gray-300)',
          background: 'var(--gem-gray-800)',
          border: '1px solid var(--gem-gray-700)',
        }}
      >
        Opened
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center text-[11px] font-semibold uppercase tracking-[0.10em] rounded-full px-2.5 py-1 whitespace-nowrap self-start"
      style={{
        color: 'var(--gem-gray-400)',
        background: 'var(--gem-gray-900)',
        border: '1px solid var(--gem-gray-700)',
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
    if (exp) metaTail = `Read your full report. Auto-passes ${exp}.`
  } else if (match.status === 'pending' && match.expiresAt) {
    const exp = fmtShortDate(match.expiresAt)
    if (exp) metaTail = `Window closes ${exp}.`
  } else if (match.status === 'opened') {
    metaTail = 'Read your full report.'
  }

  // Identity reveal: pre-Interested rows stay anonymous (generic role label).
  // Once the producer marks Interested/Commented, we show their real name —
  // it's the central trust handshake of the two-sided flow. Email is shown
  // alongside the name in the same gate so the writer can reach back out.
  const headerLabel =
    interested && match.producerName ? match.producerName : match.partnerLabel

  // mailto: subject template matches the producer-side panel for symmetry.
  const mailtoHref =
    interested && match.producerEmail
      ? `mailto:${match.producerEmail}?subject=${encodeURIComponent(
          `Re: ${match.scriptTitle ?? 'your script'} — via GEM`
        )}`
      : null

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

      {match.comment && (
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
      )}

      {interested && (
        <div
          className="flex items-center justify-end gap-2 flex-wrap"
          style={{ gridColumn: '1 / 3', marginTop: '4px' }}
        >
          <UnmatchButton matchId={match.id} />
          {mailtoHref && (
            <a
              href={mailtoHref}
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold rounded-lg px-3 py-2 transition-all duration-150 hover:brightness-105 active:scale-[0.97]"
              style={{
                background: 'transparent',
                color: 'var(--gem-accent)',
                border: '1px solid var(--gem-accent)',
              }}
            >
              <Mail size={13} strokeWidth={2.25} />
              Reply via email
            </a>
          )}
          <SendDraftButton matchId={match.id} isSubscribed={isSubscribed} />
        </div>
      )}
    </div>
  )
}

export function IndustryMatchSection({
  matches,
  isSubscribed,
}: {
  matches: DashboardMatch[]
  isSubscribed: boolean
}) {
  const [showPassed, setShowPassed] = useState(false)
  const [open, setOpen] = useState(true)

  const sorted = useMemo(() => {
    return [...matches].sort((a, b) => {
      const pa = STATUS_PRIORITY[a.status] ?? 99
      const pb = STATUS_PRIORITY[b.status] ?? 99
      if (pa !== pb) return pa - pb
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [matches])

  const visible = useMemo(
    () => sorted.filter(m => m.status !== 'passed' || showPassed),
    [sorted, showPassed]
  )
  const passedCount = sorted.filter(m => m.status === 'passed').length
  const activeCount = sorted.filter(m => m.status !== 'passed').length

  if (matches.length === 0) {
    return (
      <div
        className="border-t px-6 sm:px-8 py-5"
        style={{
          borderColor: 'var(--gem-gray-700)',
          background: 'var(--gem-gray-900)',
        }}
      >
        <div className="flex items-baseline gap-2 mb-1.5">
          <span className="text-[11.5px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gray-200)]">
            Industry match
          </span>
        </div>
        <p className="text-[13.5px] text-[var(--gem-gray-400)] m-0 leading-snug">
          Awaiting first match — we send these in your lane as they come up.
        </p>
      </div>
    )
  }

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
          Industry match
        </span>
        <span className="text-[12.5px] text-[var(--gem-gray-400)] font-medium">
          {activeCount} active
        </span>
        <ChevronDown
          size={16}
          className="ml-auto text-[var(--gem-gray-400)] transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : undefined }}
        />
      </button>

      {open && (
        <div className="px-6 sm:px-8 pb-5 pt-1 flex flex-col gap-2.5">
          {visible.map(m => (
            <MatchRow key={m.id} match={m} isSubscribed={isSubscribed} />
          ))}
          {passedCount > 0 && !showPassed && (
            <button
              type="button"
              onClick={() => setShowPassed(true)}
              className="rounded-lg py-2.5 px-4 text-[13px] font-medium text-[var(--gem-gray-400)] hover:text-[var(--gem-gray-200)] transition-colors"
              style={{
                border: '1px dashed var(--gem-gray-600)',
                background: 'transparent',
              }}
            >
              + {passedCount} earlier match{passedCount === 1 ? '' : 'es'} passed without engaging
            </button>
          )}
          {passedCount > 0 && showPassed && (
            <button
              type="button"
              onClick={() => setShowPassed(false)}
              className="text-[12.5px] text-[var(--gem-gray-500)] hover:text-[var(--gem-gray-300)] self-center transition-colors"
            >
              Hide passed matches
            </button>
          )}
        </div>
      )}
    </div>
  )
}
