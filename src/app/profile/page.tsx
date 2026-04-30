// Profile edit — /profile
// Anuj 2026-04-29 (writer profiles v0.3).

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import Nav from '@/components/nav'
import Link from 'next/link'
import { ProfileEditor } from './editor'

export default async function ProfilePage() {
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
        <div className="mb-6 flex items-center justify-between">
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
        <ProfileEditor initial={profile} />
      </main>
    </div>
  )
}
