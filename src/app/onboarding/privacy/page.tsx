// /onboarding/privacy — Path B step 2 (also reused after Path A account
// creation). Reuses the canonical PrivacyForm; on save it stamps
// privacy_confirmed_at and routes the user to the next step.
//
// Anuj 2026-04-30 v0.10.6.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { normalizePrivacyDefaults } from '@/lib/privacy-defaults'
import { OnboardingPrivacyClient } from './onboarding-privacy-client'

interface PageProps {
  searchParams: Promise<{ next?: string }>
}

export default async function OnboardingPrivacyPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/onboarding/account')

  const { data: profile } = await supabase
    .from('profiles')
    .select('privacy_defaults, privacy_confirmed_at, handle')
    .eq('id', user.id)
    .single<{ privacy_defaults: unknown; privacy_confirmed_at: string | null; handle: string | null }>()

  // Already confirmed? Skip to whatever's next.
  if (profile?.privacy_confirmed_at) {
    if (sp.next) redirect(sp.next)
    if (!profile.handle) redirect('/onboarding/profile')
    redirect('/dashboard')
  }

  const initial = normalizePrivacyDefaults(profile?.privacy_defaults)
  const next = sp.next || '/onboarding/profile'

  return (
    <OnboardingPrivacyClient
      initial={initial}
      next={next}
      hasHandle={!!profile?.handle}
    />
  )
}
