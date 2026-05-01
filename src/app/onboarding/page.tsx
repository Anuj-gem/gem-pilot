// /onboarding — entry into Path B (the no-script signup flow).
//
// Server-side dispatcher. Decides where to send the user based on what
// they've already completed:
//
//   anon                 → /onboarding/account
//   no privacy_confirmed → /onboarding/privacy
//   no profile.handle    → /onboarding/profile
//   everything done      → /dashboard
//
// All three sub-routes are independent pages so /onboarding/profile
// remains a stable bookmark for "I'd like to fill out my profile now"
// even after a user has fully onboarded — useful from the dashboard.
//
// Anuj 2026-04-30 v0.10.6.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

export default async function OnboardingEntry() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/onboarding/account')

  const { data: profile } = await supabase
    .from('profiles')
    .select('handle, privacy_confirmed_at')
    .eq('id', user.id)
    .single<{ handle: string | null; privacy_confirmed_at: string | null }>()

  if (!profile?.privacy_confirmed_at) redirect('/onboarding/privacy')
  if (!profile?.handle) redirect('/onboarding/profile')
  redirect('/dashboard')
}
