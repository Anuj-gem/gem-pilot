'use client'

// OnboardingPrivacyClient — wraps the canonical PrivacyForm in the
// OnboardingShell with the right checklist for Path B (or Path A when
// `next` is supplied).
//
// The PrivacyForm itself handles the PUT to /api/profile/privacy +
// router.refresh(). After save we route the user onward via `redirectTo`.
//
// Anuj 2026-04-30 v0.10.6.

import { PrivacyForm } from '@/components/privacy/privacy-form'
import { OnboardingShell } from '@/components/onboarding/onboarding-shell'
import type { ChecklistItem } from '@/components/onboarding/onboarding-checklist'
import type { PrivacyDefaults } from '@/lib/privacy-defaults'

interface Props {
  initial: PrivacyDefaults
  /** Where to land after privacy is confirmed. */
  next: string
  /** Whether the user has already filled in their profile. Used to pick
   *  the correct checklist destination label. */
  hasHandle: boolean
}

export function OnboardingPrivacyClient({ initial, next, hasHandle }: Props) {
  // For Path B (next === /onboarding/profile or /dashboard) the
  // checklist shows account ✓ / privacy ◉ / profile ○ / dashboard.
  // For Path A (next contains /report/...) we substitute "Open report"
  // for the dashboard line so the destination matches expectations.
  const isPathA = next.startsWith('/report') || next.includes('from=submit')

  const checklistItems: ChecklistItem[] = isPathA
    ? [
        { label: 'Got your script', state: 'done' },
        { label: 'Format chosen', state: 'done' },
        { label: 'Account created', state: 'done' },
        { label: 'Confirm privacy', state: 'current' },
        { label: 'Set up your profile', state: 'pending', hint: 'Skippable' },
        { label: 'Open your report', state: 'pending' },
      ]
    : [
        { label: 'Account created', state: 'done' },
        { label: 'Confirm privacy', state: 'current' },
        { label: 'Set up your profile', state: 'pending', hint: 'Skippable' },
        { label: hasHandle ? 'Open your dashboard' : 'Open your dashboard', state: 'pending' },
      ]

  return (
    <OnboardingShell
      checklistTitle={isPathA ? 'Your report' : 'Get set up'}
      checklistItems={checklistItems}
      heading="Pick your privacy defaults."
      subhead="These apply to every script you publish on GEM. You can change them anytime — and override per-script from any report."
    >
      <div className="max-w-[440px]">
        <div className="rounded-2xl bg-white p-5 sm:p-6 shadow-sm">
          <PrivacyForm
            initial={initial}
            redirectTo={next}
            submitLabel="Confirm and continue →"
          />
        </div>
      </div>
    </OnboardingShell>
  )
}
