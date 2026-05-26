import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { redirect } from 'next/navigation'
import { JoinClient } from './join-client'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()
  const service = svc()

  // Look up the collaborator invite
  const { data: collab } = await service
    .from('script_collaborators')
    .select('id, submission_id, collaborator_email, collaborator_id, status, role, role_other')
    .eq('id', token)
    .single()

  if (!collab) {
    return (
      <div style={{ minHeight: 'calc(100vh - 56px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Invite not found</h1>
          <p style={{ fontSize: 14, color: 'var(--gem-gray-400)' }}>This invite link may have expired or been removed.</p>
        </div>
      </div>
    )
  }

  // Fetch script info
  const { data: script } = await service
    .from('script_submissions')
    .select('id, title, declared_format, user_id')
    .eq('id', collab.submission_id)
    .single()

  // Fetch eval for logline + genres + evalId
  const { data: evalInfo } = await service
    .from('script_evaluations')
    .select('id, evaluation')
    .eq('submission_id', collab.submission_id)
    .single()

  const ev = evalInfo?.evaluation as Record<string, any> | null
  const format = ev?.format || script?.declared_format || ''
  const genres = (ev?.genres as string[])?.join(', ') || ''
  const formatGenre = [format, genres].filter(Boolean).join(' · ')
  const logline = ev?.positioning_hook || ''
  const evalId = evalInfo?.id || null

  // Fetch inviter name
  const { data: inviter } = await service
    .from('profiles')
    .select('full_name')
    .eq('id', script?.user_id || '')
    .single()

  const inviterName = inviter?.full_name || 'Someone'
  const role = collab.role_other || collab.role || 'Collaborator'

  // Check if user is already logged in
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // Auto-accept the invite and redirect to report
    if (collab.status === 'pending') {
      await service
        .from('script_collaborators')
        .update({ collaborator_id: user.id, status: 'accepted' })
        .eq('id', collab.id)
    }
    if (evalId) {
      redirect(`/report/${evalId}`)
    } else {
      redirect('/dashboard')
    }
  }

  // Not logged in — show the join page
  return (
    <JoinClient
      token={token}
      scriptTitle={script?.title || 'Untitled'}
      formatGenre={formatGenre}
      logline={logline}
      inviterName={inviterName}
      role={role}
      evalId={evalId}
      collaboratorEmail={collab.collaborator_email || ''}
    />
  )
}
