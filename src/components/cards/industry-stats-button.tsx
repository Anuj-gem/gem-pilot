'use client'

// IndustryStatsButton — owner-only chip on a script card. Clicking opens
// a small modal that fetches the four industry stats: viewed, interested,
// passed, emailed.
//
// Why createPortal: the parent card uses transitions/transforms which
// create a containing block, so a `position:fixed` modal rendered inline
// positions relative to the card instead of the viewport. Portaling to
// document.body escapes that.
//
// Click handling: the open-button uses `pointer-events-auto` and stops
// propagation so the parent overlay <Link> doesn't navigate to the
// report on the same click. The backdrop close handler only fires on
// MOUSEUP (not click) so the click that OPENED the modal can't
// immediately close it again — that's the "opens then closes" bug we
// were hitting.
//
// Anuj 2026-04-30 v0.7.

import { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { BarChart3, X, Eye, Heart, Slash, Mail } from 'lucide-react'

interface Props {
  submissionId: string
}

interface Stats {
  viewed: number
  interested: number
  passed: number
  emailed: number
}

const ZEROS: Stats = { viewed: 0, interested: 0, passed: 0, emailed: 0 }

export function IndustryStatsButton({ submissionId }: Props) {
  const [open, setOpen] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Portal target only exists on the client.
  useEffect(() => {
    setMounted(true)
  }, [])

  const fetchStats = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/scripts/${submissionId}/industry-stats`, { cache: 'no-store' })
      if (!res.ok) {
        setStats(ZEROS)
        return
      }
      const json = await res.json()
      setStats({
        viewed: Number(json?.viewed ?? 0),
        interested: Number(json?.interested ?? 0),
        passed: Number(json?.passed ?? 0),
        emailed: Number(json?.emailed ?? 0),
      })
    } catch {
      setStats(ZEROS)
    } finally {
      setLoading(false)
    }
  }, [submissionId])

  useEffect(() => {
    if (open && !stats) fetchStats()
  }, [open, stats, fetchStats])

  // Close on Escape — but only when the modal is actually open.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  // Backdrop close — fires on MOUSEUP so the original click that
  // opened the modal can't bubble back into a close action.
  const onBackdropMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(true)
        }}
        onMouseDown={(e) => {
          // Stop the parent overlay <Link> from racing this click.
          e.stopPropagation()
        }}
        className="relative z-10 pointer-events-auto inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-purple-700 bg-white hover:bg-purple-50 border border-purple-200 hover:border-purple-300 rounded-md px-2.5 py-1 transition-colors"
        title="See producer activity"
      >
        <BarChart3 size={12} />
        Stats
      </button>

      {mounted && open && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-sm"
          onMouseUp={onBackdropMouseUp}
        >
          <div
            className="w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
              <div>
                <p className="text-[10.5px] uppercase tracking-[0.16em] font-bold text-purple-700 mb-0.5">Industry</p>
                <h3 className="text-[16px] font-bold text-gray-900" style={{ fontFamily: 'Georgia, serif' }}>
                  Who&apos;s looking
                </h3>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5">
              {loading || !stats ? (
                <div className="grid grid-cols-2 gap-3">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="rounded-xl bg-gray-100 animate-pulse h-[72px]" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <StatTile icon={<Eye size={14} />} label="Viewed" value={stats.viewed} accent="gray" />
                  <StatTile icon={<Heart size={14} />} label="Interested" value={stats.interested} accent="purple" />
                  <StatTile icon={<Slash size={14} />} label="Passed" value={stats.passed} accent="gray" />
                  <StatTile icon={<Mail size={14} />} label="Emailed" value={stats.emailed} accent="amber" />
                </div>
              )}
              <p className="text-[11.5px] text-gray-500 mt-4 leading-snug">
                Counts producers and reps who&apos;ve seen, reacted to, or emailed you about this script.
              </p>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}

function StatTile({
  icon, label, value, accent,
}: {
  icon: React.ReactNode
  label: string
  value: number
  accent: 'gray' | 'purple' | 'amber'
}) {
  const valueColor =
    accent === 'purple' ? 'text-purple-700'
    : accent === 'amber' ? 'text-amber-700'
    : 'text-gray-900'
  const iconColor =
    accent === 'purple' ? 'text-purple-600'
    : accent === 'amber' ? 'text-amber-600'
    : 'text-gray-500'
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3.5">
      <div className={`flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.08em] font-bold ${iconColor}`}>
        {icon}
        {label}
      </div>
      <div className={`mt-1.5 font-extrabold tabular-nums leading-none ${valueColor}`} style={{ fontSize: 24 }}>
        {value}
      </div>
    </div>
  )
}
