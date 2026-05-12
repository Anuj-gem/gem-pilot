// /partner — rep talent review dashboard.
// Shows writers that admin has sent to this rep for review.
// Clean, curated experience — no writer-side nav or features.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { RepDashboard } from '@/components/producer/rep-dashboard'

export const dynamic = 'force-dynamic'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export default async function PartnerDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirect=/partner')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, account_type, lane')
    .eq('id', user.id)
    .single()

  if (profile?.account_type !== 'producer') redirect('/dashboard')
  if (!profile?.lane) redirect('/onboarding/producer')

  const service = svc()

  // Fetch assignments for this rep
  const { data: assignments } = await service
    .from('rep_assignments')
    .select('id, writer_id, gem_note, featured_script_ids, status, rep_note, pass_tags, created_at, responded_at')
    .eq('rep_id', user.id)
    .order('created_at', { ascending: true })

  const rows = (assignments || []) as {
    id: string; writer_id: string; gem_note: string | null
    featured_script_ids: string[] | null; status: string
    rep_note: string | null; pass_tags: string[] | null
    created_at: string; responded_at: string | null
  }[]

  // Fetch writer profiles
  const writerIds = [...new Set(rows.map(r => r.writer_id))]
  const writerMap = new Map<string, { name: string; bio: string | null; email: string | null }>()
  if (writerIds.length > 0) {
    const { data: profiles } = await service
      .from('profiles')
      .select('id, full_name, bio, email')
      .in('id', writerIds)
    for (const p of (profiles || []) as { id: string; full_name: string | null; bio: string | null; email: string | null }[]) {
      writerMap.set(p.id, {
        name: p.full_name || 'Unknown',
        bio: p.bio,
        email: p.email,
      })
    }
  }

  // Fetch ALL completed scripts + evaluations for these writers
  type ScriptWithEval = {
    submissionId: string; title: string; format: string | null
    score: number | null; evalId: string | null
  }
  const scriptsByWriter = new Map<string, ScriptWithEval[]>()

  if (writerIds.length > 0) {
    const { data: subs } = await service
      .from('script_submissions')
      .select('id, user_id, title, declared_format')
      .in('user_id', writerIds)
      .eq('status', 'completed')

    const subIds = (subs || []).map((s: any) => s.id)
    const subMap = new Map<string, { userId: string; title: string; format: string | null }>()
    for (const s of (subs || []) as { id: string; user_id: string; title: string; declared_format: string | null }[]) {
      subMap.set(s.id, { userId: s.user_id, title: s.title, format: s.declared_format })
    }

    if (subIds.length > 0) {
      const { data: evals } = await service
        .from('script_evaluations')
        .select('id, submission_id, weighted_score')
        .in('submission_id', subIds)

      const evalMap = new Map<string, { id: string; score: number | null }>()
      for (const e of (evals || []) as { id: string; submission_id: string; weighted_score: number | null }[]) {
        evalMap.set(e.submission_id, { id: e.id, score: e.weighted_score })
      }

      for (const [subId, sub] of subMap) {
        const ev = evalMap.get(subId)
        if (!scriptsByWriter.has(sub.userId)) scriptsByWriter.set(sub.userId, [])
        scriptsByWriter.get(sub.userId)!.push({
          submissionId: subId,
          title: sub.title,
          format: sub.format,
          score: ev?.score ?? null,
          evalId: ev?.id ?? null,
        })
      }

      // Sort each writer's scripts by score descending
      for (const arr of scriptsByWriter.values()) {
        arr.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      }
    }
  }

  // Build serializable items
  const items = rows.map(r => {
    const writer = writerMap.get(r.writer_id)
    const allScripts = scriptsByWriter.get(r.writer_id) ?? []
    const featuredIds = new Set(r.featured_script_ids ?? [])
    const featured = featuredIds.size > 0
      ? allScripts.filter(s => featuredIds.has(s.submissionId))
      : allScripts.slice(0, 3) // auto-top-3 by score if no featured set
    const rest = allScripts.filter(s => !featured.some(f => f.submissionId === s.submissionId))

    return {
      id: r.id,
      writerId: r.writer_id,
      writerName: writer?.name ?? 'Unknown',
      writerBio: writer?.bio ?? null,
      writerEmail: writer?.email ?? null,
      gemNote: r.gem_note,
      status: r.status as 'pending' | 'interested' | 'passed',
      repNote: r.rep_note,
      passTags: r.pass_tags,
      respondedAt: r.responded_at,
      featuredScripts: featured,
      otherScripts: rest,
      totalScripts: allScripts.length,
    }
  })

  const repName = profile.full_name?.split(' ')[0] || 'there'

  return (
    <>
      {/* Stripped nav — just GEM logo + sign out */}
      <div className="h-14" aria-hidden />
      <nav className="border-b border-[var(--gem-gray-700)] bg-[var(--gem-black)]/95 backdrop-blur-sm fixed top-0 left-0 right-0 z-50">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block w-3 h-3 rotate-45"
              style={{
                background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
                boxShadow: '0 0 10px rgba(167, 139, 250, 0.5)',
              }}
            />
            <span className="text-lg font-bold tracking-tight text-white">GEM</span>
          </span>
          <span className="text-[13px] text-[var(--gem-gray-400)]">
            {profile.full_name}
          </span>
        </div>
      </nav>

      <RepDashboard items={items} repName={repName} />
    </>
  )
}
