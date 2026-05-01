// /onboarding — entry into Path B (the no-script signup flow).
//
// Server-side dispatcher. Decides where to send the user based on what
// they've already completed:
//
//   anon                 → /onboarding/account
//   no handle            → auto-generate one (Google OAuth users) so the
//                          user always has a working public profile
//                          even if they skip /onboarding/profile.
//   no privacy_confirmed → /onboarding/privacy
//   everything done      → /dashboard
//
// Anuj 2026-04-30 v0.10.6 → v0.10.15: auto-set handle for Google
// users so a brand-new account is never broken when they hit Skip.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { findAvailableHandle } from '@/lib/handle-suggest'

export default async function OnboardingEntry() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/onboarding/account')

  const { data: profile } = await supabase
    .from('profiles')
    .select('handle, full_name, privacy_confirmed_at')
    .eq('id', user.id)
    .single<{ handle: string | null; full_name: string | null; privacy_confirmed_at: string | null }>()

  // Auto-generate a handle if missing. Google OAuth users land here
  // without one because Google doesn't ask for it; email/password users
  // pick their own in the account form so they already have one set.
  if (profile && !profile.handle) {
    const candidate = profile.full_name || user.email?.split('@')[0] || 'writer'
    const handle = await findAvailableHandle(supabase, candidate, user.id)
    await supabase.from('profiles').update({ handle }).eq('id', user.id)
  }

  if (!profile?.privacy_confirmed_at) redirect('/onboarding/privacy')
  redirect('/dashboard')
}
