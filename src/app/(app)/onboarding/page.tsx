// /onboarding — Name + intent step only.
// Once the user finishes onboarding, they land on /script.
// If they visit /onboarding after already completing it, redirect to /script.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { OnboardingClient } from './onboarding-client'

export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Logged-in users skip onboarding entirely — go straight to /script.
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()
    // If they already have a name, they've completed onboarding.
    if (profile?.full_name) redirect('/script')
  }

  return <OnboardingClient />
}
