// /start — Public onboarding page.
// Unauthenticated: shows inline signup (Google + email/password + phone)
// Authenticated with no scripts: shows upload prompt
// Authenticated with scripts + draft: shows draft review flow
// Authenticated with active review: redirects to that review

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

  // Check for existing non-complete consideration
  const { data: existing } = await service
    .from('considerations')
    .select('id, review_stage')
    .eq('writer_id', user.id)
    .neq('review_stage', 'complete')
    .limit(1)

  // If they have ANY active consideration (draft or in-progress), go straight there
  if (existing && existing.length > 0) {
    redirect(`/review/c/${existing[0].id}`)
  }

  // Authenticated user with no active review — auto-create a draft and redirect
  // This handles the post-signup flow: user lands on /start, we create their
  // draft consideration with any unreviewed scripts, then send them to the real
  // review page immediately.

  // Find all scripts NOT in any consideration
  const { data: allCons } = await service
    .from('considerations')
    .select('id')
    .eq('writer_id', user.id)
  const conIds = (allCons || []).map((c: { id: string }) => c.id)

  let reviewedScriptIds = new Set<string>()
  if (conIds.length > 0) {
    const { data: conScripts } = await service
      .from('consideration_scripts')
      .select('script_submission_id')
      .in('consideration_id', conIds)
    for (const r of (conScripts || []) as { script_submission_id: string }[]) {
      reviewedScriptIds.add(r.script_submission_id)
    }
  }

  // Include completed AND processing/queued scripts — a just-claimed anonymous
  // upload may still be processing when the user signs up
  const { data: eligibleScripts } = await service
    .from('script_submissions')
    .select('id')
    .eq('user_id', user.id)
    .in('status', ['completed', 'processing', 'queued'])
    .is('hidden_at', null)

  const unreviewedIds = (eligibleScripts || [])
    .filter((s: { id: string }) => !reviewedScriptIds.has(s.id))
    .map((s: { id: string }) => s.id)

  // Create a new draft consideration
  const { data: newDraft } = await service
    .from('considerations')
    .insert({
      writer_id: user.id,
      status: 'pending',
      review_stage: 'draft',
      submitted_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (newDraft) {
    // Attach unreviewed scripts if any
    if (unreviewedIds.length > 0) {
      await service
        .from('consideration_scripts')
        .insert(unreviewedIds.map(id => ({
          consideration_id: newDraft.id,
          script_submission_id: id,
          carried_forward: false,
        })))
    }
    redirect(`/review/c/${newDraft.id}`)
  }

  // Fallback — shouldn't happen, but redirect home if draft creation fails
  redirect('/')
}
