'use client'

// OnboardingPrivacyClient — confirm-or-customize flow.
//
// Default view: 3 toggles render visible but disabled (grayed), all ON.
// Top action bar shows "Continue with defaults". Small "Customize" link
// under the toggles ungrays them and switches the top button to
// "Save & continue".
//
// We don't reuse PrivacyForm here — it has its own embedded button +
// apply-to-all-existing-posts confirm dialog that doesn't make sense for
// brand-new users. We POST to /api/profile/privacy directly.
//
// Anuj 2026-04-30 v0.10.8.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Briefcase, Globe, MessageSquare } from 'lucide-react'
import {
  DEFAULT_PRIVACY,
  type PrivacyDefaults,
} from '@/lib/privacy-defaults'
import { OnboardingShell } from '@/components/onboarding/onboarding-shell'
import type { ChecklistItem } from '@/components/onboarding/onboarding-checklist'

interface Props {
  initial: PrivacyDefaults
  /** Where to land after privacy is confirmed. */
  next: string
  /** Whether the user has already filled in their profile. Used to set
   *  the back-button destination when present. */
  hasHandle: boolean
}

export function OnboardingPrivacyClient({ initial, next }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [customizing, setCustomizing] = useState(false)
  const [v, setV] = useState<PrivacyDefaults>(initial ?? DEFAULT_PRIVACY)

  // Path detection mirrors the OnboardingPrivacyClient v0.10.6: when
  // `next` looks like a /report/... or carries from=submit, we're in
  // Path A and the checklist labels reflect that.
  const isPathA = next.startsWith('/report') || next.includes('from=submit')

  const checklistItems: ChecklistItem[] = isPathA
    ? [
        { label: 'Got your script', state: 'done' },
        { label: 'Format chosen', state: 'done' },
        { label: 'Account created', state: 'done' },
        { label: 'Confirm privacy', state: 'current' },
        { label: 'Polish your profile', state: 'pending', hint: 'Skippable' },
        { label: 'Open your report', state: 'pending' },
      ]
    : [
        { label: 'Account created', state: 'done' },
        { label: 'Confirm privacy', state: 'current' },
        { label: 'Polish your profile', state: 'pending', hint: 'Skippable' },
        { label: 'Open your dashboard', state: 'pending' },
      ]

  const framing = isPathA
    ? 'Selznick is reading your script. Just a couple steps to make your post and profile look perfect for the GEM community.'
    : 'Get your account set up. Two quick steps.'

  function persist() {
    setError(null)
    startTransition(async () => {
      const res = await fetch('/api/profile/privacy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...v, apply_to_all: false }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error || `Save failed (${res.status})`)
        return
      }
      // ALWAYS route through /onboarding/profile next, carrying the
      // ultimate destination forward. Without this, Path A users
      // (with PDF) skipped profile entirely because `next` was the
      // report URL and we'd jump straight there. Anuj 2026-04-30
      // v0.10.9 — keep the profile step in the new-user flow.
      router.replace(`/onboarding/profile?next=${encodeURIComponent(next)}`)
    })
  }

  return (
    <OnboardingShell
      checklistTitle="Your GEM account"
      checklistItems={checklistItems}
      framingBanner={framing}
      heading="Confirm your privacy defaults."
      subhead="Sensible starting points. You can customize anytime — including per script."
      actionBar={{
        onContinue: persist,
        continueLabel: customizing ? 'Save & continue' : 'Continue with defaults',
        continueLoading: pending,
        label: 'Privacy',
      }}
    >
      <div className="max-w-[460px]">
        <div className="rounded-2xl border border-[var(--gem-gray-700)] bg-white p-5 sm:p-6 space-y-1">
          <ToggleRow
            icon={<Globe size={16} className="text-purple-700" />}
            title="Auto-publish new scripts"
            sub="You can unpublish any post later."
            value={v.public_default}
            disabled={!customizing}
            onChange={(next) => setV({ ...v, public_default: next })}
          />
          <ToggleRow
            icon={<MessageSquare size={16} className="text-purple-700" />}
            title="Allow reviews"
            sub="GEM members can read and review your script."
            value={v.allow_reviews}
            disabled={!customizing}
            onChange={(next) => setV({ ...v, allow_reviews: next })}
          />
          <ToggleRow
            icon={<Briefcase size={16} className="text-purple-700" />}
            title="Allow industry access"
            sub="Producers and reps can read your script and reach out."
            value={v.allow_industry}
            disabled={!customizing}
            onChange={(next) => setV({ ...v, allow_industry: next })}
          />
        </div>

        {!customizing && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setCustomizing(true)}
              className="text-[13px] font-semibold text-[var(--gem-gray-300)] hover:text-[var(--gem-gray-50)] underline-offset-2 hover:underline"
            >
              Customize →
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-red-300/40 bg-red-500/10 px-3 py-2 text-[12.5px] text-red-300">
            {error}
          </div>
        )}
      </div>
    </OnboardingShell>
  )
}

function ToggleRow({
  icon,
  title,
  sub,
  value,
  disabled,
  onChange,
}: {
  icon: React.ReactNode
  title: string
  sub: string
  value: boolean
  disabled: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <div
      className={`flex items-start gap-3 py-3 border-b border-gray-100 last:border-b-0 transition-opacity ${
        disabled ? 'opacity-60' : 'opacity-100'
      }`}
    >
      <div className="shrink-0 w-8 h-8 rounded-lg bg-purple-50 grid place-items-center">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-bold text-gray-900 m-0 leading-snug">{title}</p>
        <p className="text-[12.5px] text-gray-600 m-0 mt-0.5 leading-snug">{sub}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        disabled={disabled}
        aria-pressed={value}
        aria-label={title}
        className={`shrink-0 inline-flex items-center h-6 w-11 rounded-full transition-colors ${
          value ? 'bg-emerald-500' : 'bg-gray-300'
        } ${disabled ? 'cursor-not-allowed' : ''}`}
      >
        <span
          className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${
            value ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  )
}
