'use client'

// ScriptPrivacySheet — per-script privacy modal launched from the
// report-page triple-dot menu.
//
// Mirrors the account-level PrivacyForm shape (the same two toggles a
// writer set during onboarding), but scoped to a single submission. No
// Pro gating — anybody with a published post owns these settings.
//
// Anuj 2026-04-30 v0.10. Replaces the heavier DashboardPrivacyButton
// panel that was inlined in the report status bar with Pro upsells +
// per-section toggles. The per-section detail still lives in the
// account-level /profile/privacy form; per-script the writer just gets
// the two top-level switches.

import { useEffect, useState } from 'react'
import { Briefcase, Globe, MessageSquare, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  open: boolean
  onClose: () => void
  submissionId: string
  initialIsPublic: boolean
  initialAllowReviews: boolean
  initialAllowIndustry: boolean
}

export function ScriptPrivacySheet({
  open,
  onClose,
  submissionId,
  initialIsPublic,
  initialAllowReviews,
  initialAllowIndustry,
}: Props) {
  const router = useRouter()
  const [isPublic, setIsPublic] = useState(initialIsPublic)
  const [allowReviews, setAllowReviews] = useState(initialAllowReviews)
  const [allowIndustry, setAllowIndustry] = useState(initialAllowIndustry)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Re-sync if the parent re-opens with new props.
  useEffect(() => {
    if (open) {
      setIsPublic(initialIsPublic)
      setAllowReviews(initialAllowReviews)
      setAllowIndustry(initialAllowIndustry)
      setError(null)
    }
  }, [open, initialIsPublic, initialAllowReviews, initialAllowIndustry])

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  // Escape closes.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  async function persist(payload: { is_public?: boolean; allow_reviews?: boolean; allow_industry?: boolean }) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/scripts/${encodeURIComponent(submissionId)}/privacy`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Could not save.')
      }
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.')
      // Roll local state back to source of truth so the toggle reflects reality.
      setIsPublic(initialIsPublic)
      setAllowReviews(initialAllowReviews)
      setAllowIndustry(initialAllowIndustry)
    } finally {
      setBusy(false)
    }
  }

  function togglePublished() {
    const next = !isPublic
    setIsPublic(next)
    persist({ is_public: next })
  }
  function toggleReviews() {
    const next = !allowReviews
    setAllowReviews(next)
    persist({ allow_reviews: next })
  }
  function toggleIndustry() {
    const next = !allowIndustry
    setAllowIndustry(next)
    persist({ allow_industry: next })
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="script-privacy-title"
      onClick={onClose}
      className="fixed inset-0 z-[80] bg-black/55 backdrop-blur-sm flex items-end sm:items-center justify-center"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-md sm:w-[min(92vw,460px)] sm:rounded-2xl rounded-t-2xl shadow-xl"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <div aria-hidden className="sm:hidden w-10 h-1 rounded-full mx-auto mt-2.5 mb-1 bg-gray-200" />
        <div className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-5 pb-3 border-b border-gray-100">
          <div>
            <h2
              id="script-privacy-title"
              className="text-[18px] font-bold text-gray-900 tracking-tight m-0 leading-tight"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Privacy settings
            </h2>
            <p className="text-[12.5px] text-gray-500 m-0 mt-1 leading-snug">
              Just for this script. Your account defaults stay the same.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 -mr-1 -mt-1 w-8 h-8 rounded-full grid place-items-center hover:bg-gray-100 text-gray-500"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 sm:px-6 py-4 space-y-2">
          <ToggleRow
            icon={<Globe size={16} className="text-purple-700" />}
            title="Published"
            sub="On Discover and visible to other GEM members."
            on={isPublic}
            disabled={busy}
            onToggle={togglePublished}
          />
          <ToggleRow
            icon={<MessageSquare size={16} className="text-purple-700" />}
            title="Allow reviews"
            sub="GEM members can read and review this script."
            on={allowReviews}
            disabled={busy}
            onToggle={toggleReviews}
          />
          <ToggleRow
            icon={<Briefcase size={16} className="text-purple-700" />}
            title="Allow industry access"
            sub="Producers and reps can read this script and reach out."
            on={allowIndustry}
            disabled={busy}
            onToggle={toggleIndustry}
          />
        </div>

        {error && (
          <div className="px-5 sm:px-6 pb-4 -mt-1">
            <p className="text-[12px] text-red-600 m-0">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function ToggleRow({
  icon,
  title,
  sub,
  on,
  disabled,
  onToggle,
}: {
  icon: React.ReactNode
  title: string
  sub: string
  on: boolean
  disabled?: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="shrink-0 w-8 h-8 rounded-lg bg-purple-50 grid place-items-center">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14.5px] font-semibold text-gray-900 m-0 leading-tight">{title}</p>
        <p className="text-[12.5px] text-gray-500 m-0 mt-0.5 leading-snug">{sub}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-pressed={on}
        aria-label={title}
        className={`shrink-0 inline-flex items-center h-6 w-11 rounded-full transition-colors ${
          on ? 'bg-emerald-500' : 'bg-gray-300'
        } ${disabled ? 'opacity-60' : ''}`}
      >
        <span
          className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${
            on ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  )
}
