// /onboarding/profile — post-signup profile setup step.
//
// Shows photo, headline, and bio fields. Skippable.
// After save or skip → /dashboard.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { OnboardingProfileClient } from './onboarding-profile-client'

export default async function OnboardingProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signup')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, headline, bio, avatar_url')
    .eq('id', user.id)
    .single<{
      id: string
      email: string
      full_name: string | null
      headline: string | null
      bio: string | null
      avatar_url: string | null
    }>()
  if (!profile) redirect('/dashboard')

  return (
    <OnboardingProfileClient
      profile={{
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        headline: profile.headline,
        bio: profile.bio,
        avatar_url: profile.avatar_url,
      }}
    />
  )
}
