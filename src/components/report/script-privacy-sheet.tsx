'use client'

// ScriptPrivacySheet — per-script privacy modal launched from the
// report-page triple-dot menu.
//
// Five controls, all scoped to the one script (override account-level
// defaults):
//   1. Published — visible in the community feed at all
//   2. Allow reviews — peers can read + leave reviews
//   3. Allow industry access — producers/agents/managers can read + reach out
//   4. Show GEM Score — render the score badge to non-owners (you can
//      always see your own)
//   5. Show all report sections — when off, expand to per-section toggles
//
// Anuj 2026-05-01 v0.12.4 — restored the score + per-section controls
// the writer used to have. They live behind a single "Show all" toggle
// so the default flow stays one click; customizing is one extra click.

import { useEffect, useState } from 'react'
import {
  Briefcase,
  Globe,
  MessageSquare,
  Star,
  LayoutList,
  X,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  SECTION_KEYS,
  SECTION_META,
  type ReportPrivacy,
  type SectionKey,
  type Visibility,
} from '@/lib/report-privacy'

interface Props {
  open: boolean
  onClose: () => void
  submissionId: string
  initialIsPublic: boolean
  initialAllowReviews: boolean
  initialAllowIndustry: boolean
  /** Defaults true. When false, score badge is hidden from non-owners
   *  and the script is excluded from Top-GEM sort. */
  initialShowScore?: boolean
  /** Per-section visibility map. Missing keys default to 'public'. */
  initialSections?: Partial<Record<SectionKey, Visibility>>
}

function allSectionsPublic(sections: Partial<Record<SectionKey, Visibility>>): boolean {
  return SECTION_KEYS.every((k) => (sections[k] ?? 'public') === 'public')
}

export function ScriptPrivacySheet({
  open,
  onClose,
  submissionId,
  initialIsPublic,
  initialAllowReviews,
  initialAllowIndustry,
  initialShowScore = true,
  initialSections = {},
}: Props) {
  const router = useRouter()
  const [isPublic, setIsPublic] = useState(initialIsPublic)
  const [allowReviews, setAllowReviews] = useState(initialAllowReviews)
  const [allowIndustry, setAllowIndustry] = useState(initialAllowIndustry)
  const [showScore, setShowScore] = useState(initialShowScore)
  const [sections, setSections] = useState<Partial<Record<SectionKey, Visibility>>>(initialSections)
  // "Show all sections" is the single-toggle abstraction over the
  // per-section state. ON = every section public; OFF = expand to flip
  // individual sections.
  const [showAllSections, setShowAllSections] = useState(allSectionsPublic(initialSections))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Re-sync if the parent re-opens with new props.
  useEffect(() => {
    if (open) {
      setIsPublic(initialIsPublic)
      setAllowReviews(initialAllowReviews)
      setAllowIndustry(initialAllowIndustry)
      setShowScore(initialShowScore)
      setSections(initialSections)
      setShowAllSections(allSectionsPublic(initialSections))
      setError(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialIsPublic, initialAllowReviews, initialAllowIndustry, initialShowScore])

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

  async function persist(payload: {
    is_public?: boolean
    allow_reviews?: boolean
    allow_industry?: boolean
    show_score?: boolean
    sections?: Partial<Record<SectionKey, Visibility>>
  }) {
    setBusy(true)
    setError(null)
    try {
      // Build the privacy object if we're touching show_score or sections.
      const wantsPrivacyUpdate = payload.show_score !== undefined || payload.sections !== undefined
      const body: Record<string, unknown> = {}
      if (payload.is_public !== undefined) body.is_public = payload.is_public
      if (payload.allow_reviews !== undefined) body.allow_reviews = payload.allow_reviews
      if (payload.allow_industry !== undefined) body.allow_industry = payload.allow_industry
      if (wantsPrivacyUpdate) {
        const nextPrivacy: ReportPrivacy = {
          version: 1,
          sections: payload.sections ?? sections,
          show_score: payload.show_score ?? showScore,
        }
        body.privacy = nextPrivacy
      }
      const res = await fetch(`/api/scripts/${encodeURIComponent(submissionId)}/privacy`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Could not save.')
      }
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.')
      // Roll back local state to source of truth.
      setIsPublic(initialIsPublic)
      setAllowReviews(initialAllowReviews)
      setAllowIndustry(initialAllowIndustry)
      setShowScore(initialShowScore)
      setSections(initialSections)
      setShowAllSections(allSectionsPublic(initialSections))
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
  function toggleScore() {
    const next = !showScore
    setShowScore(next)
    persist({ show_score: next })
  }
  function toggleShowAllSections() {
    const next = !showAllSections
    setShowAllSections(next)
    if (next) {
      // Flipping ON resets every section to public.
      const nextSections: Partial<Record<SectionKey, Visibility>> = {}
      for (const k of SECTION_KEYS) nextSections[k] = 'public'
      setSections(nextSections)
      persist({ sections: nextSections })
    }
    // Flipping OFF just expands the panel — saves happen as the user
    // taps individual sections below.
  }
  function toggleSection(key: SectionKey) {
    const current = sections[key] ?? 'public'
    const nextVis: Visibility = current === 'public' ? 'private' : 'public'
    const nextSections = { ...sections, [key]: nextVis }
    setSections(nextSections)
    setShowAllSections(allSectionsPublic(nextSections))
    persist({ sections: nextSections })
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
        className="bg-white w-full sm:max-w-md sm:w-[min(92vw,460px)] sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[90vh] overflow-y-auto"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <div aria-hidden className="sm:hidden w-10 h-1 rounded-full mx-auto mt-2.5 mb-1 bg-gray-200" />
        <div className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-5 pb-3 border-b border-gray-100 sticky top-0 bg-white z-10">
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
            sub="Listed in the community feed."
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
            sub="Producers and reps can read and reach out."
            on={allowIndustry}
            disabled={busy}
            onToggle={toggleIndustry}
          />
          <ToggleRow
            icon={<Star size={16} className="text-purple-700" />}
            title="Show your GEM Score"
            sub="Hide it and you won't appear in Top-GEM rankings."
            on={showScore}
            disabled={busy}
            onToggle={toggleScore}
          />
          <ToggleRow
            icon={<LayoutList size={16} className="text-purple-700" />}
            title="Show all report sections"
            sub="Off lets you hide individual sections from non-owners."
            on={showAllSections}
            disabled={busy}
            onToggle={toggleShowAllSections}
          />

          {!showAllSections && (
            <div className="pl-11 pr-1 pt-1 space-y-1">
              {SECTION_KEYS.map((k) => {
                const meta = SECTION_META[k]
                const visible = (sections[k] ?? 'public') === 'public'
                return (
                  <div key={k} className="flex items-start gap-3 py-1.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-gray-900 m-0 leading-tight">{meta.label}</p>
                      <p className="text-[11.5px] text-gray-500 m-0 mt-0.5 leading-snug">{meta.hint}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleSection(k)}
                      disabled={busy}
                      aria-pressed={visible}
                      className={`shrink-0 inline-flex items-center h-5 w-9 rounded-full transition-colors ${
                        visible ? 'bg-emerald-500' : 'bg-gray-300'
                      } ${busy ? 'opacity-60' : ''}`}
                    >
                      <span
                        className={`block w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          visible ? 'translate-x-[18px]' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
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
