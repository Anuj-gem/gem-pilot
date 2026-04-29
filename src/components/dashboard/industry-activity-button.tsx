'use client'

// Writer-facing "Industry activity" button + sheet. Shows aggregate stats
// (views, interested, emailed) for one script plus a per-producer list
// with name, company, status, and timestamp. Used both on the dashboard
// (per-card) and on the report page (via the "···" menu).

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Activity, Eye, Check, X, Mail, MessageCircle, X as CloseIcon } from 'lucide-react'
import { PrivacyConfirmSheet } from '@/components/report/privacy-confirm-sheet'
import { StatsStrip } from '@/components/dashboard/stats-strip'

export type ActivityStatus =
  | 'pending'
  | 'opened'
  | 'interested'
  | 'commented'
  | 'passed'

export interface IndustryActivityRow {
  matchId: string
  status: ActivityStatus
  producerName: string | null
  producerCompany: string | null
  /** Industry role — 'producer' or 'representative'. Set at invite time
   *  by GEM staff. Null for legacy rows; UI falls back to a generic label. */
  producerRole: 'producer' | 'representative' | null
  /** Timestamp of the most relevant action — reacted_at when present, else
   *  opened_at, else created_at. Used as the "happened on" date. */
  happenedAt: string | null
  comment: string | null
  producerEmailedAt: string | null
  unmatchedAt: string | null
}

interface Props {
  rows: IndustryActivityRow[]
  /** How the trigger renders.
   *   - 'stats' (default): inline 3-stat strip (views · interested · emailed)
   *     that doubles as the "open details" button. Used on dashboard cards.
   *   - 'menu-item': full-width row used inside OwnerActionsMenu.
   *   - 'pill': small bordered "Activity" button (legacy compact trigger). */
  triggerVariant?: 'stats' | 'pill' | 'menu-item'
}

function computeCounts(rows: IndustryActivityRow[]) {
  const live = rows.filter((r) => !r.unmatchedAt)
  return {
    views: live.filter((r) =>
      ['opened', 'interested', 'commented', 'passed'].includes(r.status)
    ).length,
    interested: live.filter((r) =>
      ['interested', 'commented'].includes(r.status)
    ).length,
    passed: live.filter((r) => r.status === 'passed').length,
    emailed: live.filter((r) => !!r.producerEmailedAt).length,
  }
}

/** Standalone activity sheet — renderable by any caller that wants its
 *  own trigger. Used by IndustryActivityButton (default trigger) and by
 *  OwnerActionsMenu (activity opens from the "···" menu). */
export function IndustryActivitySheet({
  open,
  onClose,
  rows,
}: {
  open: boolean
  onClose: () => void
  rows: IndustryActivityRow[]
}) {
  const router = useRouter()
  // Local "ended" set — when the writer ends a match, we mark it ended in
  // the UI right away (without waiting for router.refresh) so the row
  // updates immediately. The server-side row gets unmatched_at on the
  // next refresh.
  const [locallyEnded, setLocallyEnded] = useState<Set<string>>(new Set())
  const [endConfirm, setEndConfirm] = useState<IndustryActivityRow | null>(null)
  const [ending, setEnding] = useState(false)
  const [endError, setEndError] = useState<string | null>(null)

  async function confirmEnd() {
    if (!endConfirm) return
    setEnding(true)
    setEndError(null)
    try {
      const res = await fetch(
        `/api/writer/match/${encodeURIComponent(endConfirm.matchId)}/unmatch`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      )
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error || 'Could not end the match.')
      }
      setLocallyEnded((prev) => {
        const next = new Set(prev)
        next.add(endConfirm.matchId)
        return next
      })
      setEndConfirm(null)
      router.refresh()
    } catch (err) {
      setEndError(
        err instanceof Error ? err.message : 'Could not end the match.'
      )
    } finally {
      setEnding(false)
    }
  }

  // Lock body scroll when sheet's open.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  // Escape closes.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  // Apply local "ended" overrides so freshly ended matches reflect in
  // the stats and per-row state without a server round trip.
  const effectiveRows: IndustryActivityRow[] = rows.map((r) =>
    locallyEnded.has(r.matchId)
      ? { ...r, unmatchedAt: r.unmatchedAt ?? new Date().toISOString() }
      : r
  )

  const live = effectiveRows.filter((r) => !r.unmatchedAt)
  const viewed = live.filter((r) =>
    ['opened', 'interested', 'commented', 'passed'].includes(r.status)
  ).length
  const interested = live.filter((r) =>
    ['interested', 'commented'].includes(r.status)
  ).length
  const emailed = live.filter((r) => !!r.producerEmailedAt).length
  const passed = live.filter((r) => r.status === 'passed').length

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="industry-activity-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-md sm:w-[min(92vw,500px)] sm:rounded-2xl rounded-t-2xl shadow-xl flex flex-col max-h-[85vh]"
        style={{
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
        }}
      >
        <div
          aria-hidden
          className="sm:hidden w-10 h-1 rounded-full mx-auto mt-2.5 mb-1"
          style={{ background: 'var(--gem-gray-700)' }}
        />
        <div className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-5">
          <div>
            <h2
              id="industry-activity-title"
              className="text-[16px] sm:text-[17px] font-bold text-[var(--gem-gray-50)] tracking-tight m-0 leading-tight"
            >
              Industry activity
            </h2>
            <p className="text-[12.5px] text-[var(--gem-gray-400)] m-0 mt-1">
              Who&apos;s seen your script + what they did.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 -mr-1 -mt-1 w-8 h-8 rounded-full grid place-items-center hover:bg-[var(--gem-gray-800)] text-[var(--gem-gray-500)]"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 px-5 sm:px-6 mt-4">
          <StatCell label="Views" value={viewed} accent="neutral" />
          <StatCell label="Interested" value={interested} accent="success" />
          <StatCell label="Emailed" value={emailed} accent="accent" />
        </div>
        {passed > 0 && (
          <p className="text-[11.5px] text-[var(--gem-gray-500)] m-0 mt-2 px-5 sm:px-6">
            {passed} producer{passed === 1 ? '' : 's'} passed.
          </p>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-4 mt-2">
          {effectiveRows.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[13.5px] text-[var(--gem-gray-400)] m-0">
                No industry activity yet.
              </p>
              <p className="text-[12px] text-[var(--gem-gray-500)] m-0 mt-1.5">
                Producers see new scripts in their lane within minutes.
              </p>
            </div>
          ) : (
            <ul className="list-none m-0 p-0 space-y-2.5">
              {effectiveRows.map((r) => (
                <ActivityRow
                  key={r.matchId}
                  row={r}
                  onEnd={() => setEndConfirm(r)}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      <PrivacyConfirmSheet
        open={endConfirm !== null}
        title={
          endConfirm?.producerName
            ? `End match with ${endConfirm.producerName}?`
            : 'End this match?'
        }
        body="This producer will lose access to your script and won&rsquo;t see it on their dashboard. They&rsquo;ll be notified the match ended. You can&rsquo;t undo this."
        confirmLabel="End match"
        cancelLabel="Keep the match"
        tone="danger"
        busy={ending}
        onConfirm={confirmEnd}
        onClose={() => {
          setEndConfirm(null)
          setEndError(null)
        }}
      />
      {endError && (
        <p className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[60] text-[12px] text-red-600 bg-white px-3 py-1.5 rounded-md border border-red-200 shadow-md">
          {endError}
        </p>
      )}
    </div>
  )
}

export function IndustryActivityButton({
  rows,
  triggerVariant = 'stats',
}: Props) {
  const [open, setOpen] = useState(false)
  const counts = computeCounts(rows)

  let trigger: React.ReactNode
  if (triggerVariant === 'menu-item') {
    trigger = (
      <button
        type="button"
        onClick={() => setOpen(true)}
        role="menuitem"
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-[13.5px] text-[var(--gem-gray-100)] hover:bg-[var(--gem-gray-900)] transition-colors"
      >
        <Activity size={14} className="shrink-0" />
        <span className="flex-1">Industry activity</span>
      </button>
    )
  } else if (triggerVariant === 'pill') {
    trigger = (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-[12px] text-[var(--gem-gray-400)] hover:text-[var(--gem-gold)] transition-colors px-2.5 py-1 rounded-md border border-[var(--gem-gray-700)]"
        title="See who's viewed and engaged"
      >
        <Activity size={12} />
        Activity
      </button>
    )
  } else {
    // 'stats' (default): inline strip becomes the open trigger.
    trigger = (
      <StatsStrip
        views={counts.views}
        interested={counts.interested}
        passed={counts.passed}
        emailed={counts.emailed}
        onOpen={() => setOpen(true)}
      />
    )
  }

  return (
    <>
      {trigger}
      <IndustryActivitySheet
        open={open}
        onClose={() => setOpen(false)}
        rows={rows}
      />
    </>
  )
}

function StatCell({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent: 'neutral' | 'success' | 'accent'
}) {
  const palette =
    accent === 'success'
      ? { fg: '#059669', bg: 'rgba(5,150,105,0.06)', border: 'rgba(5,150,105,0.20)' }
      : accent === 'accent'
        ? {
            fg: 'var(--gem-accent)',
            bg: 'rgba(124,58,237,0.05)',
            border: 'rgba(124,58,237,0.18)',
          }
        : {
            fg: 'var(--gem-gray-200)',
            bg: 'var(--gem-gray-900)',
            border: 'var(--gem-gray-700)',
          }
  return (
    <div
      className="rounded-lg px-3 py-2.5 text-center tabular-nums"
      style={{ background: palette.bg, border: `1px solid ${palette.border}` }}
    >
      <p
        className="text-[20px] font-bold leading-none m-0"
        style={{ color: palette.fg }}
      >
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-[0.14em] font-bold m-0 mt-1 text-[var(--gem-gray-500)]">
        {label}
      </p>
    </div>
  )
}

function ActivityRow({
  row,
  onEnd,
}: {
  row: IndustryActivityRow
  onEnd: () => void
}) {
  // Display name. Names + emails reveal once a producer has marked
  // Interested or Commented (or Passed-with-comment); pre-Interested rows
  // stay anonymous. Anuj 2026-04-29: anonymous label now reflects the
  // viewer's industry role so the writer sees a mix of "A representative
  // viewed" and "A producer viewed" — flat "A producer" for every row
  // hid the rep/producer split.
  const showName =
    row.status === 'interested' ||
    row.status === 'commented' ||
    (row.status === 'passed' && (row.comment ?? '').trim().length > 0)
  const anonymousLabel =
    row.producerRole === 'representative' ? 'A representative' : 'A producer'
  const displayName = showName
    ? row.producerName ?? anonymousLabel
    : anonymousLabel
  const company = showName ? row.producerCompany?.trim() : ''
  // Role display — surface "Producer" / "Representative" alongside the
  // name once the identity has been revealed. Pre-reveal we use a generic
  // fallback so the writer still gets a sense of the surface.
  const roleLabel = (() => {
    if (!row.producerRole) return showName ? 'Industry partner' : 'Producer'
    if (row.producerRole === 'representative') return 'Representative'
    return 'Producer'
  })()
  const showEndAction =
    !row.unmatchedAt &&
    (row.status === 'interested' || row.status === 'commented')

  // Status pill copy + color.
  const pill = (() => {
    if (row.unmatchedAt) {
      return {
        text: 'Match ended',
        bg: 'var(--gem-gray-900)',
        fg: 'var(--gem-gray-500)',
        border: 'var(--gem-gray-700)',
        icon: <X size={11} />,
      }
    }
    if (row.status === 'interested' || row.status === 'commented') {
      return {
        text: row.status === 'commented' ? 'Note sent' : 'Interested',
        bg: 'rgba(5,150,105,0.10)',
        fg: '#059669',
        border: 'rgba(5,150,105,0.30)',
        icon:
          row.status === 'commented' ? (
            <MessageCircle size={11} />
          ) : (
            <Check size={11} strokeWidth={2.5} />
          ),
      }
    }
    if (row.status === 'passed') {
      return {
        text: 'Passed',
        bg: 'var(--gem-gray-900)',
        fg: 'var(--gem-gray-400)',
        border: 'var(--gem-gray-700)',
        icon: <X size={11} />,
      }
    }
    if (row.status === 'opened') {
      return {
        text: 'Viewed',
        bg: 'rgba(124,58,237,0.06)',
        fg: 'var(--gem-accent)',
        border: 'rgba(124,58,237,0.22)',
        icon: <Eye size={11} />,
      }
    }
    return {
      text: 'Pending',
      bg: 'var(--gem-gray-900)',
      fg: 'var(--gem-gray-500)',
      border: 'var(--gem-gray-700)',
      icon: <Eye size={11} />,
    }
  })()

  const dateStr = row.happenedAt
    ? new Date(row.happenedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : null

  return (
    <li
      className="rounded-lg px-3 py-2.5"
      style={{
        background: 'var(--gem-gray-900)',
        border: '1px solid var(--gem-gray-700)',
      }}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-semibold text-[var(--gem-gray-50)] m-0 leading-tight truncate">
            {displayName}
          </p>
          <p className="text-[11.5px] text-[var(--gem-gray-500)] m-0 mt-0.5">
            {roleLabel}
            {company && (
              <>
                <span className="text-[var(--gem-gray-600)] mx-1">·</span>
                {company}
              </>
            )}
            {dateStr && (
              <>
                <span className="text-[var(--gem-gray-600)] mx-1.5">·</span>
                {dateStr}
              </>
            )}
            {row.producerEmailedAt && (
              <>
                <span className="text-[var(--gem-gray-600)] mx-1.5">·</span>
                <span
                  className="inline-flex items-center gap-1"
                  style={{ color: 'var(--gem-accent)' }}
                >
                  <Mail size={10} />
                  Emailed you
                </span>
              </>
            )}
          </p>
        </div>
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] uppercase tracking-[0.12em] font-bold shrink-0"
          style={{
            background: pill.bg,
            color: pill.fg,
            border: `1px solid ${pill.border}`,
          }}
        >
          {pill.icon}
          {pill.text}
        </span>
      </div>
      {row.comment && (
        <p
          className="text-[12.5px] text-[var(--gem-gray-200)] leading-snug m-0 mt-2 px-2.5 py-2 rounded-md italic"
          style={{
            background: 'rgba(255,255,255,0.02)',
            borderLeft: '2px solid var(--gem-gray-700)',
          }}
        >
          &ldquo;{row.comment}&rdquo;
        </p>
      )}
      {showEndAction && (
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={onEnd}
            className="text-[11.5px] text-[var(--gem-gray-500)] hover:text-red-600 transition-colors"
          >
            End match with this {row.producerRole === 'representative' ? 'rep' : 'producer'}
          </button>
        </div>
      )}
    </li>
  )
}

