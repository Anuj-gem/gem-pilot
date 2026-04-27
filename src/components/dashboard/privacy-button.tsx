'use client'

// Dashboard privacy button — small companion control on each script card
// so the writer can adjust per-section visibility (and hide their score)
// without leaving the dashboard.
//
// Tap "Privacy" → opens a bottom sheet (mobile) / centered card (desktop)
// listing each section + the score with a one-tap pill. Tapping any pill
// fires the same PrivacyConfirmSheet the report page uses so the flow is
// consistent across surfaces.

import { useEffect, useState } from 'react'
import { Eye, Lock, Shield, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  isScoreVisible,
  resolveVisibility,
  SECTION_KEYS,
  SECTION_META,
  normalizePrivacy,
  type ReportPrivacy,
  type SectionKey,
  type Visibility,
} from '@/lib/report-privacy'
import { PrivacyConfirmSheet } from '@/components/report/privacy-confirm-sheet'

interface Props {
  submissionId: string
  initialPrivacy: ReportPrivacy | null
}

export function DashboardPrivacyButton({
  submissionId,
  initialPrivacy,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [privacy, setPrivacy] = useState<ReportPrivacy>(() =>
    normalizePrivacy(initialPrivacy)
  )
  const [pendingConfirm, setPendingConfirm] = useState<
    | { kind: 'section'; key: SectionKey; nextVis: Visibility }
    | { kind: 'score'; nextShown: boolean }
    | null
  >(null)
  const [busy, setBusy] = useState(false)

  // Lock body scroll when the sheet's open.
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
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  async function persist(next: ReportPrivacy) {
    setBusy(true)
    try {
      const res = await fetch(
        `/api/scripts/${encodeURIComponent(submissionId)}/privacy`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            privacy: { sections: next.sections },
            ...(next.show_score !== undefined
              ? { show_score: next.show_score }
              : {}),
          }),
        }
      )
      if (res.ok) {
        setPrivacy(next)
        router.refresh()
      }
    } catch {
      /* swallow */
    } finally {
      setBusy(false)
      setPendingConfirm(null)
    }
  }

  function handleConfirm() {
    if (!pendingConfirm) return
    if (pendingConfirm.kind === 'section') {
      const next: ReportPrivacy = {
        version: 1,
        sections: {
          ...privacy.sections,
          [pendingConfirm.key]: pendingConfirm.nextVis,
        },
        ...(privacy.show_score !== undefined
          ? { show_score: privacy.show_score }
          : {}),
      }
      persist(next)
    } else {
      const next: ReportPrivacy = {
        ...privacy,
        show_score: pendingConfirm.nextShown,
      }
      persist(next)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-[12px] text-[var(--gem-gray-400)] hover:text-[var(--gem-gold)] transition-colors px-2.5 py-1 rounded-md border border-[var(--gem-gray-700)]"
        aria-label="Privacy settings"
        title="Adjust what industry partners see"
      >
        <Shield size={12} />
        Privacy
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dashboard-privacy-title"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full sm:max-w-md sm:w-[min(92vw,460px)] sm:rounded-2xl rounded-t-2xl shadow-xl flex flex-col max-h-[85vh]"
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
                  id="dashboard-privacy-title"
                  className="text-[16px] sm:text-[17px] font-bold text-[var(--gem-gray-50)] tracking-tight m-0 leading-tight"
                >
                  Privacy
                </h2>
                <p className="text-[12.5px] text-[var(--gem-gray-400)] m-0 mt-1">
                  Tap any pill to flip what industry partners see.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="shrink-0 -mr-1 -mt-1 w-8 h-8 rounded-full grid place-items-center hover:bg-[var(--gem-gray-800)] text-[var(--gem-gray-500)]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-4">
              {/* Score toggle */}
              <PrivacyRow
                label="GEM score"
                hint="Whether the score badge shows on your report cover."
                visible={isScoreVisible(privacy)}
                onTap={() =>
                  setPendingConfirm({
                    kind: 'score',
                    nextShown: !isScoreVisible(privacy),
                  })
                }
              />
              <div className="my-3 border-t border-[var(--gem-gray-800)]" />
              {/* Section toggles */}
              {SECTION_KEYS.map((k) => {
                const meta = SECTION_META[k]
                const vis = resolveVisibility(privacy, k)
                return (
                  <PrivacyRow
                    key={k}
                    label={meta.label}
                    hint={meta.hint}
                    visible={vis === 'public'}
                    onTap={() =>
                      setPendingConfirm({
                        kind: 'section',
                        key: k,
                        nextVis: vis === 'public' ? 'private' : 'public',
                      })
                    }
                  />
                )
              })}
            </div>
          </div>
        </div>
      )}

      <PrivacyConfirmSheet
        open={pendingConfirm !== null}
        title={(() => {
          if (!pendingConfirm) return ''
          if (pendingConfirm.kind === 'score') {
            return pendingConfirm.nextShown
              ? 'Show your score to industry partners?'
              : 'Hide your score from industry partners?'
          }
          const label = SECTION_META[pendingConfirm.key]?.label ?? 'this section'
          return pendingConfirm.nextVis === 'private'
            ? `Make "${label}" private?`
            : `Make "${label}" public?`
        })()}
        body={(() => {
          if (!pendingConfirm) return ''
          if (pendingConfirm.kind === 'score') {
            return pendingConfirm.nextShown
              ? 'Industry partners will see your score on the report cover.'
              : 'Industry partners won\u2019t see your score. You\u2019ll still see it.'
          }
          return pendingConfirm.nextVis === 'private'
            ? 'Industry partners won\u2019t see this section. You can flip it back anytime.'
            : 'Industry partners will see this section. You can flip it back anytime.'
        })()}
        confirmLabel={(() => {
          if (!pendingConfirm) return 'Yes'
          if (pendingConfirm.kind === 'score') {
            return pendingConfirm.nextShown ? 'Show score' : 'Hide score'
          }
          return pendingConfirm.nextVis === 'private'
            ? 'Make private'
            : 'Make public'
        })()}
        tone={(() => {
          if (!pendingConfirm) return 'primary'
          if (pendingConfirm.kind === 'score') {
            return pendingConfirm.nextShown ? 'success' : 'primary'
          }
          return pendingConfirm.nextVis === 'private' ? 'primary' : 'success'
        })()}
        busy={busy}
        onConfirm={handleConfirm}
        onClose={() => setPendingConfirm(null)}
      />
    </>
  )
}

function PrivacyRow({
  label,
  hint,
  visible,
  onTap,
}: {
  label: string
  hint: string
  visible: boolean
  onTap: () => void
}) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-[var(--gem-gray-50)] m-0 leading-tight">
          {label}
        </p>
        <p className="text-[12px] text-[var(--gem-gray-400)] m-0 mt-0.5 leading-snug">
          {hint}
        </p>
      </div>
      <button
        type="button"
        onClick={onTap}
        className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] uppercase tracking-[0.12em] font-bold transition-colors ${
          visible
            ? 'text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100'
            : 'text-[var(--gem-gray-500)] bg-white border border-[var(--gem-gray-700)] hover:text-[var(--gem-gray-300)]'
        }`}
      >
        {visible ? <Eye size={11} /> : <Lock size={11} />}
        {visible ? 'Public' : 'Private'}
      </button>
    </div>
  )
}
