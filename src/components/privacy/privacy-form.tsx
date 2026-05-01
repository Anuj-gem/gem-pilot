'use client'

// PrivacyForm — the canonical form for the 3 top-level toggles + the
// section-visibility panel. Used by:
//   - /profile/privacy (standalone settings page)
//   - the new-user onboarding step
//   - the existing-user blocking prompt on the dashboard
//
// Anuj 2026-04-30 v0.10.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Check, Loader2, Globe, MessageSquare, Briefcase } from 'lucide-react'
import { DEFAULT_PRIVACY, privacySectionList, type PrivacyDefaults } from '@/lib/privacy-defaults'
import { type SectionKey } from '@/lib/report-privacy'

interface Props {
  initial: PrivacyDefaults
  /** Where to send the user after a successful save. Onboarding +
   *  blocking prompt → /dashboard. Standalone page → null (stay). */
  redirectTo?: string | null
  /** Submit-button label. Defaults to "Save". */
  submitLabel?: string
  /** Render an explanatory eyebrow above the form. */
  showOnboardingHelp?: boolean
}

const TOGGLES = [
  {
    key: 'public_default' as const,
    icon: Globe,
    title: 'Auto-publish new scripts',
    sub: 'You can unpublish any post later.',
  },
  {
    key: 'allow_reviews' as const,
    icon: MessageSquare,
    title: 'Allow reviews',
    sub: 'GEM members can read and review your script.',
  },
  {
    key: 'allow_industry' as const,
    icon: Briefcase,
    title: 'Allow industry access',
    sub: 'Producers and reps can read your script and reach out.',
  },
]

// Real sections from src/lib/report-privacy.ts SECTION_KEYS — pulled
// via privacySectionList() so the form stays in sync with what
// actually renders on the report page. Plus a "GEM Score" entry that
// maps to PrivacyDefaults.show_score.
const SECTIONS = privacySectionList()

export function PrivacyForm({ initial, redirectTo = null, submitLabel = 'Save', showOnboardingHelp = false }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [v, setV] = useState<PrivacyDefaults>(initial ?? DEFAULT_PRIVACY)
  const [sectionsOpen, setSectionsOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  // Did the per-post toggles change since the form loaded? If so, on save
  // we offer to apply the change to every existing script too — otherwise
  // "off" only affects future posts and writers get surprised that old
  // posts still take reviews / industry inquiries (Anuj 2026-04-30 v0.10.1).
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

  return (
    <div className="space-y-5">
      {showOnboardingHelp && (
        <p className="text-[13px] text-gray-600 leading-snug">
          You can change these anytime.
        </p>
      )}

      {/* TOP-LEVEL TOGGLES */}
      <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
        {TOGGLES.map((t) => (
          <ToggleRow
            key={t.key}
            icon={<t.icon size={18} />}
            title={t.title}
            sub={t.sub}
            value={v[t.key]}
            onChange={(next) => setV({ ...v, [t.key]: next })}
          />
        ))}
      </div>

      {/* SECTION VISIBILITY PANEL */}
      <details
        open={sectionsOpen}
        onToggle={(e) => setSectionsOpen((e.target as HTMLDetailsElement).open)}
        className="rounded-xl border border-gray-200 bg-white"
      >
        <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[14px] font-bold text-gray-900 m-0">What viewers see when they open your report</p>
            <p className="text-[12px] text-gray-600 m-0 mt-0.5">Toggle individual sections on or off. Defaults to everything on.</p>
          </div>
          <ChevronDown
            size={16}
            className={`shrink-0 text-gray-400 transition-transform ${sectionsOpen ? 'rotate-180' : ''}`}
          />
        </summary>
        <div className="px-4 pt-1 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SECTIONS.map((s) => {
            const checked = s.key === 'show_score' ? v.show_score : v.sections[s.key as SectionKey]
            const onChange = (next: boolean) => {
              if (s.key === 'show_score') {
                setV({ ...v, show_score: next })
              } else {
                setV({ ...v, sections: { ...v.sections, [s.key]: next } })
              }
            }
            return (
              <label key={s.key} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                <span className="text-[13px] text-gray-800">{s.label}</span>
                <Switch checked={checked} onChange={onChange} />
              </label>
            )
          })}
        </div>
      </details>

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
  if (reviewsChanged) lines.push(newReviews ? 'open reviews on every existing post' : 'close reviews on every existing post')
  if (industryChanged) lines.push(newIndustry ? 'allow industry access on every existing post' : 'remove industry access from every existing post')
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
          <h3 className="text-[18px] font-bold text-gray-900 m-0 leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
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
  icon, title, sub, value, onChange,
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

function Switch({ checked, onChange }: { checked: boolean; onChange: (next: boolean) => void }) {
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
