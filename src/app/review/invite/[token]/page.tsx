// /review/invite/[token] — invite acceptance landing.
//
// Anuj 2026-04-29 (peer-reviews v0.2).
//
// Flow:
//   1. Validate token via service client (RLS-bypassing — invite holder
//      may not own the script).
//   2. If user is NOT logged in → redirect to /signup (with email
//      pre-filled and next= back to this page). After signup the user
//      lands here again, now logged in.
//   3. If user IS logged in → mark the invite invited_user_id = user.id
//      and status = accepted, then redirect to /review/{submission_id}.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import Nav from '@/components/nav'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ token: string }>
}

function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export default async function InviteLandingPage({ params }: PageProps) {
  const { token } = await params
  const service = createServiceClient()

  const { data: invite } = await service
    .from('review_invites')
    .select(`
      id, submission_id, invited_email, invited_user_id, status, expires_at,
      script_submissions ( title ),
      profiles!review_invites_invited_by_fkey ( full_name )
    `)
    .eq('token', token)
    .maybeSingle<{
      id: string
      submission_id: string
      invited_email: string
      invited_user_id: string | null
      status: string
      expires_at: string
      script_submissions: { title: string } | null
      profiles: { full_name: string | null } | null
    }>()

  if (!invite) {
    return InvalidInvite('Invite not found.')
  }

  if (new Date(invite.expires_at) < new Date()) {
    return InvalidInvite('This invite has expired.')
  }
  if (invite.status === 'declined' || invite.status === 'expired') {
    return InvalidInvite('This invite is no longer active.')
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Not logged in → bounce to signup with email pre-filled, next=back-here
    const next = `/review/invite/${token}`
    const signupUrl = `/signup?email=${encodeURIComponent(invite.invited_email)}&redirect=${encodeURIComponent(next)}`
    redirect(signupUrl)
  }

  // Logged in — accept the invite (link user to invite + mark accepted)
  // unless already linked.
  if (!invite.invited_user_id || invite.invited_user_id !== user.id) {
    await service
      .from('review_invites')
      .update({
        invited_user_id: user.id,
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invite.id)
  }

  // Redirect into the actual review form for this script
  redirect(`/review/${invite.submission_id}`)
}

function InvalidInvite(message: string) {
  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <main className="max-w-md mx-auto px-6 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Invite not available
        </h1>
        <p className="text-gray-600 mb-8">{message}</p>
        <Link
          href="/dashboard"
          className="inline-block px-5 py-2.5 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700"
        >
          Go to dashboard
        </Link>
      </main>
    </div>
  )
}
