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
import { ChevronDown, Check, Loader2 } from 'lucide-react'
import { DEFAULT_PRIVACY, type PrivacyDefaults } from '@/lib/privacy-defaults'

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
    title: 'Public to GEM members',
    sub: 'Your scripts appear on Community and on your profile page. Other GEM members can find and review them.',
  },
  {
    key: 'allow_industry' as const,
    title: 'Allow GEM industry partners to access your script and reach out',
    sub: 'Producers and reps can read your full report, download your script PDF, and email you directly. You’ll see exactly who’s looking from your dashboard.',
  },
  {
    key: 'allow_reviewer_script_access' as const,
    title: 'Let reviewers read your script',
    sub: 'When a community member reviews your script, they can also pull the PDF. Off means reviewers can only see the report. Turning this on tends to attract more (and deeper) reviews.',
  },
]

const SECTIONS = [
  { key: 'headline' as const,   label: 'Headline (logline)' },
  { key: 'score' as const,      label: 'GEM Score' },
  { key: 'cast' as const,       label: 'Cast / Lead characters' },
  { key: 'packaging' as const,  label: 'Packaging' },
  { key: 'issues' as const,     label: 'Issues / Development priorities' },
  { key: 'complexity' as const, label: 'Project Complexity' },
  { key: 'risk' as const,       label: 'Risk details' },
  { key: 'comps' as const,      label: 'Comparable scripts' },
]

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
        <div className="rounded-xl bg-purple-50 border border-purple-200 px-4 py-3">
          <p className="text-[13px] text-purple-900 m-0">
            These defaults apply to <strong>all your scripts</strong>. You can change them anytime from your profile.
          </p>
        </div>
      )}

      {/* TOP-LEVEL TOGGLES */}
      <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
        {TOGGLES.map((t) => (
          <ToggleRow
            key={t.key}
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
          {SECTIONS.map((s) => (
            <label key={s.key} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer">
              <span className="text-[13px] text-gray-800">{s.label}</span>
              <Switch
                checked={v.sections[s.key]}
                onChange={(next) => setV({ ...v, sections: { ...v.sections, [s.key]: next } })}
              />
            </label>
          ))}
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
  title, sub, value, onChange,
}: {
  title: string
  sub: string
  value: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <label className="flex items-start justify-between gap-4 px-4 py-3.5 cursor-pointer">
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-bold text-gray-900 m-0 leading-snug">{title}</p>
        <p className="text-[12.5px] text-gray-600 m-0 mt-1 leading-snug">{sub}</p>
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
