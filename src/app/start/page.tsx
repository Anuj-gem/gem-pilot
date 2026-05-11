// /start — Public onboarding / signup page.
// Unauthenticated: shows inline signup (Google + email/password + phone)
// Authenticated: claims anonymous uploads, redirects to dashboard.

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import Nav from '@/components/nav'
import { StartPageClient } from '@/components/start/start-page-client'
import { ScriptUploadModal } from '@/components/script-upload-modal'

export const dynamic = 'force-dynamic'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export default async function StartPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Not logged in — show the product in empty state (light theme)
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Nav />
        <StartPageClient user={null} profile={null} scripts={[]} hasActiveDraft={null} />
        <ScriptUploadModal />
      </div>
    )
  }

  const service = svc()

  // ── Claim anonymous uploads ──────────────────────────────────────────
  // When a user uploads before signing up, the script_submissions row has
  // user_id = null. The upload component stores those IDs in a cookie.
  // Now that they're authenticated, claim those rows.
  const cookieStore = await cookies()
  const anonCookie = cookieStore.get('gem_anon_scripts')
  if (anonCookie?.value) {
    const anonIds = anonCookie.value.split(',').filter(Boolean)
    if (anonIds.length > 0) {
      // Claim: set user_id on rows that are still anonymous
      await service
        .from('script_submissions')
        .update({ user_id: user.id })
        .in('id', anonIds)
        .is('user_id', null)

      // Also move storage files from anonymous/ to user/ path
      // (not critical — scoring already has the file_url, and the row
      // is what matters for the draft. Storage path stays as-is.)
    }
    // Clear the cookie
    cookieStore.set('gem_anon_scripts', '', { path: '/', maxAge: 0 })
  }

  // Authenticated — scripts claimed, send to dashboard.
  redirect('/dashboard')
}
