// /start — Public onboarding page.
// Unauthenticated: shows inline signup (Google + email/password + phone)
// Authenticated with no scripts: shows upload prompt
// Authenticated with scripts + draft: shows draft review flow
// Authenticated with active review: redirects to that review

import { redirect } from 'next/navigation'
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

  // Check for existing non-complete consideration
  const { data: existing } = await service
    .from('considerations')
    .select('id, review_stage')
    .eq('writer_id', user.id)
    .neq('review_stage', 'complete')
    .limit(1)

  // If they have an active (non-draft) review, go straight there
  if (existing && existing.length > 0 && existing[0].review_stage !== 'draft') {
    redirect(`/review/c/${existing[0].id}`)
  }

  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, handle, bio, avatar_url, headline, phone')
    .eq('id', user.id)
    .single()

  // Get completed scripts
  const { data: completedScripts } = await service
    .from('script_submissions')
    .select('id, title, status, declared_format, created_at')
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .is('hidden_at', null)
    .order('created_at', { ascending: false })

  // Get scripts already in any consideration
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

  // Filter to unreviewed scripts
  const unreviewedScripts = (completedScripts || [])
    .filter((s: { id: string }) => !reviewedScriptIds.has(s.id))
    .map((s: any) => ({
      id: s.id,
      title: s.title,
      format: s.declared_format,
      createdAt: s.created_at,
    }))

  // Evaluations for scores
  const scriptIds = unreviewedScripts.map((s: { id: string }) => s.id)
  let evalMap = new Map<string, { id: string; score: number | null; genre: string | null }>()
  if (scriptIds.length > 0) {
    const { data: evals } = await service
      .from('script_evaluations')
      .select('id, submission_id, weighted_score, evaluation')
      .in('submission_id', scriptIds)
    for (const e of (evals || []) as any[]) {
      const evJson = e.evaluation as Record<string, unknown> | null
      const cls = (evJson?.classification as Record<string, unknown>) || {}
      const fmt = (evJson?.format_detection as Record<string, unknown>) || {}
      const genre = (cls.genre_primary as string) || (fmt.genre_primary as string) || null
      evalMap.set(e.submission_id, { id: e.id, score: e.weighted_score, genre })
    }
  }

  const scriptsWithScores = unreviewedScripts.map((s: any) => {
    const ev = evalMap.get(s.id)
    return {
      ...s,
      score: ev?.score ?? null,
      evaluationId: ev?.id ?? null,
      genre: ev?.genre ?? null,
    }
  })

  // Processing scripts
  const { data: processingScripts } = await service
    .from('script_submissions')
    .select('id, title, declared_format, created_at')
    .eq('user_id', user.id)
    .in('status', ['processing', 'queued'])
    .order('created_at', { ascending: false })

  const processing = (processingScripts || []).map((s: any) => ({
    id: s.id,
    title: s.title,
    format: s.declared_format,
    createdAt: s.created_at,
    isProcessing: true,
  }))

  const draftId = existing?.[0]?.id ?? null

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <StartPageClient
        user={{ id: user.id, email: user.email || '' }}
        profile={profile ? {
          fullName: profile.full_name,
          handle: profile.handle,
          bio: profile.bio,
          avatarUrl: profile.avatar_url,
          headline: profile.headline,
          phone: profile.phone,
        } : null}
        scripts={[...processing, ...scriptsWithScores]}
        hasActiveDraft={draftId}
      />
      <ScriptUploadModal />
    </div>
  )
}
