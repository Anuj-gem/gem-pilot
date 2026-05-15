// /onboarding/profile — last step in both Path A and Path B.
//
// The user can either fill out their profile (handle, headline, bio,
// avatar, IMDB link) or skip and go straight to the destination. We
// don't gate anything on a profile being filled in — it's framed as
// "let people who see your script know a little about you."
//
// Anuj 2026-04-30 v0.10.6.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { OnboardingProfileClient } from './onboarding-profile-client'

interface PageProps {
  searchParams: Promise<{ next?: string }>
}

export default async function OnboardingProfilePage({ searchParams }: PageProps) {
  const sp = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/onboarding/account')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, handle, headline, bio, imdb_url, avatar_url, privacy_confirmed_at')
    .eq('id', user.id)
    .single<{
      id: string
      email: string
      full_name: string | null
      handle: string | null
      headline: string | null
      bio: string | null
      imdb_url: string | null
      avatar_url: string | null
      privacy_confirmed_at: string | null
    }>()
  if (!profile) redirect('/dashboard')
  // Privacy must be confirmed before we let the user set up their profile —
  // otherwise the standalone PrivacyConfirmPrompt on /dashboard will fire
  // mid-onboarding which feels broken.
  if (!profile.privacy_confirmed_at) {
    const next = sp.next ? `?next=${encodeURIComponent(sp.next)}` : ''
    redirect(`/onboarding/privacy${next}`)
  }

  const next = sp.next || '/dashboard'

  return (
    <OnboardingProfileClient
      profile={{
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        handle: profile.handle,
        headline: profile.headline,
        bio: profile.bio,
        imdb_url: profile.imdb_url,
        avatar_url: profile.avatar_url,
      }}
      next={next}
    />
  )
}
