'use client'

// OnboardingProfileClient — last step in both Path A and Path B.
//
// Form fields live inline (no card wrapper). Skip and Continue both sit
// in the OnboardingShell action bar — equally weighted, no hierarchy
// implied, so the user never feels trapped on this step.
//
// Continue is enabled the moment something is filled in — even just a
// photo. Empty state sends the user through Skip. Returning users who
// land here just hit Skip too.
//
// Anuj 2026-04-30 v0.10.8.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { OnboardingShell } from '@/components/onboarding/onboarding-shell'
import type { ChecklistItem } from '@/components/onboarding/onboarding-checklist'
import {
  OnboardingProfileFields,
  type ProfileFieldsValue,
} from '@/components/onboarding/onboarding-profile-fields'
import { updateProfile } from '@/app/profile/actions'

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

function suggestHandle(name: string | null, email: string): string {
  const base = (name || email.split('@')[0] || '').toLowerCase()
  return base.replace(/[^a-z0-9-]/g, '').slice(0, 32) || ''
}

export function OnboardingProfileClient({ profile, next }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [v, setV] = useState<ProfileFieldsValue>({
    full_name: profile.full_name ?? '',
    handle: profile.handle ?? suggestHandle(profile.full_name, profile.email),
    headline: profile.headline ?? '',
    bio: profile.bio ?? '',
    imdb_url: profile.imdb_url ?? '',
    avatar_url: profile.avatar_url ?? null,
  })

  const isPathA = next.startsWith('/report') || next.includes('from=submit')

  const checklistItems: ChecklistItem[] = isPathA
    ? [
        { label: 'Got your script', state: 'done' },
        { label: 'Format chosen', state: 'done' },
        { label: 'Account created', state: 'done' },
        { label: 'Privacy confirmed', state: 'done' },
        { label: 'Polish your profile', state: 'current', hint: 'Skippable' },
        { label: 'Open your report', state: 'pending' },
      ]
    : [
        { label: 'Account created', state: 'done' },
        { label: 'Privacy confirmed', state: 'done' },
        { label: 'Polish your profile', state: 'current', hint: 'Skippable' },
        { label: 'Open your dashboard', state: 'pending' },
      ]

  const framing = isPathA
    ? 'Your report is almost ready. Polish how you appear to the GEM community — or skip and come back to this later.'
    : 'Last step. Polish how you appear to writers and producers — or skip and come back later.'

  function save() {
    setError(null)
    startTransition(async () => {
      const res = await updateProfile({
        full_name: v.full_name,
        handle: v.handle,
        headline: v.headline,
        bio: v.bio,
        imdb_url: v.imdb_url,
      })
      if ('error' in res && res.error) {
        setError(res.error)
        return
      }
      router.replace(next)
    })
  }

  function skip() {
    router.replace(next)
  }

  // We light up Continue only when the user has filled something in
  // beyond the suggested handle. If nothing's changed they should just
  // hit Skip — no point persisting placeholder data.
  const dirty =
    v.full_name !== (profile.full_name ?? '') ||
    v.headline !== (profile.headline ?? '') ||
    v.bio !== (profile.bio ?? '') ||
    v.imdb_url !== (profile.imdb_url ?? '') ||
    v.avatar_url !== (profile.avatar_url ?? null) ||
    v.handle !== (profile.handle ?? '')

  return (
    <OnboardingShell
      checklistTitle="Your GEM account"
      checklistItems={checklistItems}
      framingBanner={framing}
      heading="Polish your profile."
      subhead="How you'll appear to writers and producers reading your script. Skip anytime — you can come back to this from any page."
      actionBar={{
        onSkip: skip,
        onContinue: save,
        continueLabel: 'Save & continue',
        continueDisabled: !dirty,
        continueLoading: pending,
        label: 'Profile',
      }}
    >
      <div className="max-w-[520px]">
        <div className="rounded-2xl border border-[var(--gem-gray-700)] bg-white p-5 sm:p-6">
          <OnboardingProfileFields
            userId={profile.id}
            email={profile.email}
            value={v}
            onChange={setV}
          />
        </div>
        {error && (
          <div className="mt-4 rounded-lg border border-red-300/40 bg-red-500/10 px-3 py-2 text-[12.5px] text-red-300">
            {error}
          </div>
        )}
      </div>
    </OnboardingShell>
  )
}
