// Profile edit — /profile
// Anuj 2026-04-29 (writer profiles v0.3).

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import Nav from '@/components/nav'
import Link from 'next/link'
import { ProfileEditor } from './editor'

interface PageProps {
  searchParams: Promise<{ onboarding?: string }>
}

export default async function ProfilePage({ searchParams }: PageProps) {
  const sp = await searchParams
  const isOnboarding = sp.onboarding === '1'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/profile')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, handle, headline, bio, imdb_url, avatar_url')
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
    }>()

  if (!profile) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <main className="max-w-2xl mx-auto px-6 py-10">
        {isOnboarding ? (
          <div className="mb-6">
            <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-purple-700 mb-2">
              Welcome to GEM
            </p>
            <h1 className="text-3xl font-bold text-gray-900 mb-3" style={{ fontFamily: 'Georgia, serif' }}>
              Let's set up your profile.
            </h1>
            <p className="text-[15px] text-gray-600 leading-relaxed">
              GEM is built around your public writer profile — it's how other
              writers and reviewers on GEM find your work. Pick
              a handle and a one-line headline to get going. The rest is
              optional and you can come back to it any time.
            </p>
          </div>
        ) : (
          <div className="mb-6">
            <Link
              href="/dashboard"
              className="text-[12px] text-gray-500 hover:text-gray-900 font-semibold"
            >
              ← Back to dashboard
            </Link>
            <div className="mt-3 flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Your profile</h1>
              {profile.handle && (
                <Link
                  href={`/w/${profile.handle}`}
                  className="text-sm font-semibold text-purple-700 hover:text-purple-900"
                >
                  View public profile →
                </Link>
              )}
            </div>
          </div>
        )}
        <ProfileEditor initial={profile} returnTo={isOnboarding ? '/dashboard' : null} />
      </main>
    </div>
  )
}
