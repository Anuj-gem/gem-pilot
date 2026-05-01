'use client'

// OnboardingProfileClient — wraps the existing ProfileEditor inside the
// OnboardingShell + checklist, with a Skip button so the user can land
// on their destination without filling anything in.
//
// The framing is intentionally low-pressure ("Skippable" hint on the
// checklist + Skip-for-now button) because we don't want to lose
// signups to friction here.
//
// Anuj 2026-04-30 v0.10.6.

import Link from 'next/link'
import { ProfileEditor } from '@/app/profile/editor'
import { OnboardingShell } from '@/components/onboarding/onboarding-shell'
import type { ChecklistItem } from '@/components/onboarding/onboarding-checklist'

interface ProfileShape {
  id: string
  email: string
  full_name: string | null
  handle: string | null
  headline: string | null
  bio: string | null
  imdb_url: string | null
  avatar_url: string | null
}

interface Props {
  profile: ProfileShape
  next: string
}

export function OnboardingProfileClient({ profile, next }: Props) {
  const isPathA = next.startsWith('/report') || next.includes('from=submit')

  const checklistItems: ChecklistItem[] = isPathA
    ? [
        { label: 'Got your script', state: 'done' },
        { label: 'Format chosen', state: 'done' },
        { label: 'Account created', state: 'done' },
        { label: 'Privacy confirmed', state: 'done' },
        { label: 'Set up your profile', state: 'current', hint: 'Skippable' },
        { label: 'Open your report', state: 'pending' },
      ]
    : [
        { label: 'Account created', state: 'done' },
        { label: 'Privacy confirmed', state: 'done' },
        { label: 'Set up your profile', state: 'current', hint: 'Skippable' },
        { label: 'Open your dashboard', state: 'pending' },
      ]

  return (
    <OnboardingShell
      checklistTitle={isPathA ? 'Your report' : 'Get set up'}
      checklistItems={checklistItems}
      heading="Tell people who you are."
      subhead="Set up your profile so writers and producers who read your script know a little about you. You can skip and come back to this anytime."
      footer={
        <Link
          href={next}
          prefetch={false}
          className="inline-block text-[var(--gem-gray-300)] hover:text-[var(--gem-gray-100)] underline-offset-2 hover:underline"
        >
          Skip for now — I&rsquo;ll do this later →
        </Link>
      }
    >
      <div className="max-w-[520px] rounded-2xl bg-white p-5 sm:p-6 shadow-sm">
        <ProfileEditor initial={profile} returnTo={next} />
      </div>
    </OnboardingShell>
  )
}
