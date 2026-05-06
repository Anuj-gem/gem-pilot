// /consideration/submit — Select scripts and submit for consideration.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { ConsiderationForm } from '@/components/consideration/consideration-form'
import { UpgradeModalListener } from '@/components/dashboard/upgrade-modal-listener'

export const dynamic = 'force-dynamic'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export default async function ConsiderationSubmitPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/consideration/submit')

  const service = svc()

  // Check if there's already an active consideration
  const { data: existing } = await service
    .from('considerations')
    .select('id')
    .eq('writer_id', user.id)
    .eq('status', 'pending')
    .limit(1)

  if (existing && existing.length > 0) {
    redirect('/dashboard')
  }

  // Check subscription status
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status')
    .eq('id', user.id)
    .single()
  const isPro = profile?.subscription_status === 'active'

  // Get all completed scripts
  const { data: scripts } = await supabase
    .from('script_submissions')
    .select('id, title, declared_format, created_at, status, hidden_at')
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .is('hidden_at', null)
    .order('created_at', { ascending: true }) // oldest first so [0] is the first script

  const completedScripts = (scripts || []) as {
    id: string; title: string; declared_format: string | null; created_at: string
  }[]

  // Get evaluations for scores
  const scriptIds = completedScripts.map(s => s.id)
  const evalMap = new Map<string, number | null>()
  if (scriptIds.length > 0) {
    const { data: evals } = await service
      .from('script_evaluations')
      .select('submission_id, weighted_score')
      .in('submission_id', scriptIds)
    for (const e of (evals || []) as { submission_id: string; weighted_score: number | null }[]) {
      evalMap.set(e.submission_id, e.weighted_score)
    }
  }

  // Find scripts that were in previous considerations (carry forward)
  const { data: pastConsiderations } = await service
    .from('considerations')
    .select('id')
    .eq('writer_id', user.id)
    .eq('status', 'reviewed')
    .order('submitted_at', { ascending: false })
    .limit(1)

  let carriedScriptIds: string[] = []
  if (pastConsiderations && pastConsiderations.length > 0) {
    const { data: cs } = await service
      .from('consideration_scripts')
      .select('script_submission_id')
      .eq('consideration_id', pastConsiderations[0].id)
    carriedScriptIds = (cs || []).map((r: { script_submission_id: string }) => r.script_submission_id)
  }

  // For trial users, only their first (oldest) script is eligible
  const firstScriptId = completedScripts.length > 0 ? completedScripts[0].id : null

  const scriptData = completedScripts.map(s => ({
    id: s.id,
    title: s.title,
    format: s.declared_format,
    score: evalMap.get(s.id) ?? null,
    carriedForward: carriedScriptIds.includes(s.id),
    createdAt: s.created_at,
    eligible: isPro || s.id === firstScriptId,
  }))

  return (
    <div className="max-w-lg mx-auto py-8 px-4">
      <ConsiderationForm scripts={scriptData} isPro={isPro} />
      {!isPro && <UpgradeModalListener />}
    </div>
  )
}
