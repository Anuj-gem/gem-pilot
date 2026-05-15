// /onboarding/account — Path B step 1.
//
// New writer flow: no PDF in flight, just create the account. After
// signup we route to /onboarding/privacy.
//
// If the user is already logged in, bounce to /onboarding (the entry
// dispatcher will route them to the correct next step).
//
// Anuj 2026-04-30 v0.10.6.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { OnboardingAccountClient } from './onboarding-account-client'

export default async function OnboardingAccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/script')
  return <OnboardingAccountClient />
}
