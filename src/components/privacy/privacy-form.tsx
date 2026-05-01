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

  const handleSubmit = () => {
    setError(null)
    startTransition(async () => {
      const res = await fetch('/api/profile/privacy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(v),
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
