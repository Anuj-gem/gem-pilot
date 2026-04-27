'use client'

// Writer-facing "Industry activity" button + sheet. Shows aggregate stats
// (views, interested, emailed) for one script plus a per-producer list
// with name, company, status, and timestamp. Used both on the dashboard
// (per-card) and on the report page (via the "···" menu).

import { useEffect, useState } from 'react'
import { Activity, Eye, Check, X, Mail, MessageCircle, X as CloseIcon } from 'lucide-react'

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
  /** Timestamp of the most relevant action — reacted_at when present, else
   *  opened_at, else created_at. Used as the "happened on" date. */
  happenedAt: string | null
  comment: string | null
  producerEmailedAt: string | null
  unmatchedAt: string | null
}

interface Props {
  rows: IndustryActivityRow[]
  /** How the trigger renders. 'pill' = small bordered button (dashboard
   *  cards). 'menu-item' = full-width row used inside OwnerActionsMenu. */
  triggerVariant?: 'pill' | 'menu-item'
  /** Optional pre-computed counts so the dashboard pill can show "3 new"
   *  without forcing the consumer to recompute. */
  triggerLabelOverride?: string
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

  const live = rows.filter((r) => !r.unmatchedAt)
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
          {rows.length === 0 ? (
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
              {rows.map((r) => (
                <ActivityRow key={r.matchId} row={r} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export function IndustryActivityButton({
  rows,
  triggerVariant = 'pill',
  triggerLabelOverride,
}: Props) {
  const [open, setOpen] = useState(false)
  const triggerLabel = triggerLabelOverride ?? buildTriggerLabel(rows)

  const trigger =
    triggerVariant === 'menu-item' ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        role="menuitem"
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-[13.5px] text-[var(--gem-gray-100)] hover:bg-[var(--gem-gray-900)] transition-colors"
      >
        <Activity size={14} className="shrink-0" />
        <span className="flex-1">Industry activity</span>
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-[12px] text-[var(--gem-gray-400)] hover:text-[var(--gem-gold)] transition-colors px-2.5 py-1 rounded-md border border-[var(--gem-gray-700)]"
        title="See who's viewed and engaged"
      >
        <Activity size={12} />
        {triggerLabel}
      </button>
    )

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

function ActivityRow({ row }: { row: IndustryActivityRow }) {
  // Display name. Names + emails reveal once a producer has marked
  // Interested or Commented (or Passed-with-comment); pre-Interested rows
  // stay anonymous as "A producer".
  const showName =
    row.status === 'interested' ||
    row.status === 'commented' ||
    (row.status === 'passed' && (row.comment ?? '').trim().length > 0)
  const displayName = showName
    ? row.producerName ?? 'A producer'
    : 'A producer'
  const company = showName ? row.producerCompany?.trim() : ''

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
            {company ? (
              <span className="text-[var(--gem-gray-400)] font-normal">
                {' '}
                · {company}
              </span>
            ) : null}
          </p>
          {dateStr && (
            <p className="text-[11.5px] text-[var(--gem-gray-500)] m-0 mt-0.5">
              {dateStr}
              {row.producerEmailedAt && (
                <>
                  <span className="mx-1.5 text-[var(--gem-gray-600)]">·</span>
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
          )}
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
    </li>
  )
}

function buildTriggerLabel(rows: IndustryActivityRow[]): string {
  const live = rows.filter((r) => !r.unmatchedAt)
  const viewed = live.filter((r) =>
    ['opened', 'interested', 'commented', 'passed'].includes(r.status)
  ).length
  if (viewed === 0) return 'Activity'
  return `Activity · ${viewed}`
}
