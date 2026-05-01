'use client'

// PrivacyForm — account-level privacy defaults.
// Used by:
//   - /profile/privacy (standalone settings page)
//   - the new-user onboarding step
//   - the existing-user blocking prompt on the dashboard
//
// v0.12.5 — replaced <details> panel with toggle-with-expand pattern
// matching ScriptPrivacySheet. Five top-level toggles + section expand.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Check,
  Loader2,
  Globe,
  MessageSquare,
  Briefcase,
  Star,
  LayoutList,
} from 'lucide-react'
import { DEFAULT_PRIVACY, type PrivacyDefaults } from '@/lib/privacy-defaults'
import { SECTION_KEYS, SECTION_META, type SectionKey } from '@/lib/report-privacy'

interface Props {
  initial: PrivacyDefaults
  redirectTo?: string | null
  submitLabel?: string
  showOnboardingHelp?: boolean
}

function allSectionsOn(sections: Record<SectionKey, boolean>): boolean {
  return SECTION_KEYS.every((k) => sections[k] !== false)
}

export function PrivacyForm({
  initial,
  redirectTo = null,
  submitLabel = 'Save',
  showOnboardingHelp = false,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [v, setV] = useState<PrivacyDefaults>(initial ?? DEFAULT_PRIVACY)
  const [showAllSections, setShowAllSections] = useState(allSectionsOn(v.sections))
  const [confirmOpen, setConfirmOpen] = useState(false)

  const reviewsChanged = (initial?.allow_reviews ?? true) !== v.allow_reviews
  const industryChanged = (initial?.allow_industry ?? true) !== v.allow_industry
  const perPostToggleChanged = reviewsChanged || industryChanged

  const persist = (applyToAll: boolean) => {
    setError(null)
    setConfirmOpen(false)
    startTransition(async () => {
      const res = await fetch('/api/profile/privacy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...v, apply_to_all: applyToAll }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error || `Save failed (${res.status})`)
        return
      }
      if (redirectTo) {
        router.replace(redirectTo)
        router.refresh()
      } else {
        router.refresh()
      }
    })
  }

  const handleSubmit = () => {
    if (perPostToggleChanged) {
      setConfirmOpen(true)
      return
    }
    persist(false)
  }

  function toggleShowAll() {
    const next = !showAllSections
    setShowAllSections(next)
    if (next) {
      const allOn = SECTION_KEYS.reduce((acc, k) => {
        acc[k] = true
        return acc
      }, {} as Record<SectionKey, boolean>)
      setV({ ...v, sections: allOn })
    }
  }

  function toggleSection(key: SectionKey) {
    const nextSections = { ...v.sections, [key]: !v.sections[key] }
    setV({ ...v, sections: nextSections })
    setShowAllSections(allSectionsOn(nextSections))
  }

  return (
    <div className="space-y-5">
      {showOnboardingHelp && (
        <p className="text-[13px] text-gray-600 leading-snug">
          These are your defaults for new scripts. You can override any of them per-script later.
        </p>
      )}

      <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
        <ToggleRow
          icon={<Globe size={18} />}
          title="Auto-publish new scripts"
          sub="You can unpublish any post later."
          value={v.public_default}
          onChange={(next) => setV({ ...v, public_default: next })}
        />
        <ToggleRow
          icon={<MessageSquare size={18} />}
          title="Allow reviews"
          sub="GEM members can read and review your script."
          value={v.allow_reviews}
          onChange={(next) => setV({ ...v, allow_reviews: next })}
        />
        <ToggleRow
          icon={<Briefcase size={18} />}
          title="Allow industry access"
          sub="Producers and reps can read your script and reach out."
          value={v.allow_industry}
          onChange={(next) => setV({ ...v, allow_industry: next })}
        />
        <ToggleRow
          icon={<Star size={18} />}
          title="Show your GEM Score"
          sub="Hide it and new scripts won't appear in Top-GEM rankings."
          value={v.show_score}
          onChange={(next) => setV({ ...v, show_score: next })}
        />
        <ToggleRow
          icon={<LayoutList size={18} />}
          title="Show all report sections"
          sub="Off lets you hide individual sections by default."
          value={showAllSections}
          onChange={toggleShowAll}
        />
      </div>

      {!showAllSections && (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 space-y-1">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider m-0 mb-2">
            Section defaults for new scripts
          </p>
          {SECTION_KEYS.map((k) => {
            const meta = SECTION_META[k]
            const visible = v.sections[k] !== false
            return (
              <div key={k} className="flex items-center justify-between gap-3 py-1.5">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-gray-900 m-0 leading-tight">
                    {meta.label}
                  </p>
                  <p className="text-[11.5px] text-gray-500 m-0 mt-0.5 leading-snug">
                    {meta.hint}
                  </p>
                </div>
                <Switch checked={visible} onChange={() => toggleSection(k)} />
              </div>
            )
          })}
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-[12.5px] text-red-700">
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={pending}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-[14px] py-3 transition-colors disabled:opacity-60"
      >
        {pending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
        {pending ? 'Saving…' : submitLabel}
      </button>

      {confirmOpen && (
        <ApplyToAllConfirm
          reviewsChanged={reviewsChanged}
          industryChanged={industryChanged}
          newReviews={v.allow_reviews}
          newIndustry={v.allow_industry}
          onCancel={() => setConfirmOpen(false)}
          onApplyToAll={() => persist(true)}
          onJustFuture={() => persist(false)}
          pending={pending}
        />
      )}
    </div>
  )
}

function ApplyToAllConfirm({
  reviewsChanged,
  industryChanged,
  newReviews,
  newIndustry,
  onCancel,
  onApplyToAll,
  onJustFuture,
  pending,
}: {
  reviewsChanged: boolean
  industryChanged: boolean
  newReviews: boolean
  newIndustry: boolean
  onCancel: () => void
  onApplyToAll: () => void
  onJustFuture: () => void
  pending: boolean
}) {
  const lines: string[] = []
  if (reviewsChanged)
    lines.push(
      newReviews
        ? 'open reviews on every existing post'
        : 'close reviews on every existing post',
    )
  if (industryChanged)
    lines.push(
      newIndustry
        ? 'allow industry access on every existing post'
        : 'remove industry access from every existing post',
    )
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
      className="fixed inset-0 z-[90] bg-black/55 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-md rounded-2xl shadow-xl"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <div className="px-5 sm:px-6 pt-5 pb-3 border-b border-gray-100">
          <h3
            className="text-[18px] font-bold text-gray-900 m-0 leading-tight"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Apply to all your existing posts?
          </h3>
          <p className="text-[13px] text-gray-600 m-0 mt-1.5 leading-snug">
            By default these settings only affect new posts. We can also{' '}
            {lines.join(' and ')} you&rsquo;ve already published.
          </p>
        </div>
        <div className="px-5 sm:px-6 py-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={onApplyToAll}
            disabled={pending}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-[14px] py-3 transition-colors disabled:opacity-60"
          >
            Apply to all my posts
          </button>
          <button
            type="button"
            onClick={onJustFuture}
            disabled={pending}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-[13.5px] py-2.5 transition-colors disabled:opacity-60"
          >
            Just new posts from now on
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="text-[12.5px] text-gray-500 hover:text-gray-900 font-medium mt-1"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function ToggleRow({
  icon,
  title,
  sub,
  value,
  onChange,
}: {
  icon?: React.ReactNode
  title: string
  sub: string
  value: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <label className="flex items-start justify-between gap-4 px-4 py-3.5 cursor-pointer">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        {icon && (
          <span className="shrink-0 w-9 h-9 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center mt-0.5">
            {icon}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold text-gray-900 m-0 leading-snug">{title}</p>
          <p className="text-[12.5px] text-gray-600 m-0 mt-0.5 leading-snug">{sub}</p>
        </div>
      </div>
      <Switch checked={value} onChange={onChange} />
    </label>
  )
}

function Switch({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative shrink-0 inline-flex h-6 w-10 items-center rounded-full transition-colors ${
        checked ? 'bg-purple-600' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block w-4 h-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  )
}
