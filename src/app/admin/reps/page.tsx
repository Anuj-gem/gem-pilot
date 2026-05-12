// /admin/reps — Admin page to send writers to reps/producers for review.
// Gated to admin emails only. Completely separate from the writer-facing opportunity system.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { AdminRepSend } from '@/components/admin/admin-rep-send'

export const dynamic = 'force-dynamic'

const ADMIN_EMAILS = [
  'anuj@gem.studio',
  'anujkommareddy@gmail.com',
  'anuj+producer@gem.studio',
]

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export default async function AdminRepsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!ADMIN_EMAILS.includes(user.email || '')) redirect('/dashboard')

  const service = svc()

  // Load all producer accounts (reps)
  const { data: producers } = await service
    .from('profiles')
    .select('id, full_name, email')
    .eq('account_type', 'producer')
    .order('full_name')

  const reps = (producers || []).map((p: any) => ({
    id: p.id,
    name: p.full_name || p.email,
    email: p.email,
  }))

  // Load all data with parallel queries — no .in() with large ID arrays (URL length limit)
  type WriterScript = { id: string; title: string; format: string | null; score: number | null; evalId: string | null }
  type WriterOption = { id: string; name: string; email: string; bio: string | null; scripts: WriterScript[]; topScore: number | null }

  const [
    { data: allProfiles },
    { data: allScripts },
    { data: allEvals },
  ] = await Promise.all([
    service.from('profiles').select('id, full_name, email, bio').eq('account_type', 'writer').order('full_name').range(0, 4999),
    service.from('script_submissions').select('id, user_id, title, declared_format').eq('status', 'completed').order('created_at', { ascending: false }).range(0, 4999),
    service.from('script_evaluations').select('id, submission_id, weighted_score').range(0, 9999),
  ])

  // Build eval lookup
  const evalMap = new Map<string, { evalId: string; score: number | null }>()
  for (const e of (allEvals || []) as any[]) {
    evalMap.set(e.submission_id, { evalId: e.id, score: e.weighted_score })
  }

  // Group scripts by writer
  const scriptsByWriter = new Map<string, WriterScript[]>()
  for (const s of (allScripts || []) as any[]) {
    if (!scriptsByWriter.has(s.user_id)) scriptsByWriter.set(s.user_id, [])
    const ev = evalMap.get(s.id)
    scriptsByWriter.get(s.user_id)!.push({
      id: s.id,
      title: s.title,
      format: s.declared_format,
      score: ev?.score ?? null,
      evalId: ev?.evalId ?? null,
    })
  }

  // Sort each writer's scripts by score desc
  for (const arr of scriptsByWriter.values()) {
    arr.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  }

  // Only include writers who have at least one completed script
  const writers: WriterOption[] = (allProfiles || [])
    .filter((p: any) => scriptsByWriter.has(p.id))
    .map((p: any) => {
      const scripts = scriptsByWriter.get(p.id) ?? []
      const topScore = scripts.length > 0 ? Math.max(...scripts.map(s => s.score ?? 0)) : null
      return { id: p.id, name: p.full_name || 'Unknown', email: p.email, bio: p.bio, scripts, topScore }
    })
    .sort((a: WriterOption, b: WriterOption) => (b.topScore ?? 0) - (a.topScore ?? 0))

  // Load existing assignments for reference
  const { data: existingAssignments } = await service
    .from('rep_assignments')
    .select('id, rep_id, writer_id, status, gem_note, featured_script_ids, created_at')
    .order('created_at', { ascending: false })

  // Fetch names for assigned writers (don't rely on the writers array — it may be truncated)
  const assignedWriterIds = [...new Set((existingAssignments || []).map((a: any) => a.writer_id))]
  const assignedNameMap = new Map<string, string>()
  if (assignedWriterIds.length > 0) {
    const { data: assignedProfiles } = await service
      .from('profiles')
      .select('id, full_name, email')
      .in('id', assignedWriterIds)
    for (const p of (assignedProfiles || []) as { id: string; full_name: string | null; email: string }[]) {
      assignedNameMap.set(p.id, p.full_name || p.email)
    }
  }

  const assignments = (existingAssignments || []).map((a: any) => ({
    id: a.id,
    repId: a.rep_id,
    writerId: a.writer_id,
    writerName: assignedNameMap.get(a.writer_id) || 'Unknown',
    status: a.status,
    gemNote: a.gem_note,
    featuredScriptIds: a.featured_script_ids,
    createdAt: a.created_at,
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[15px] font-bold text-gray-900">GEM Admin</span>
            <span className="text-[12px] text-gray-400">/ Rep assignments</span>
          </div>
          <a href="/dashboard" className="text-[13px] text-purple-600 hover:text-purple-700">
            ← Back to dashboard
          </a>
        </div>
      </nav>

      <AdminRepSend
        reps={reps}
        writers={writers}
        existingAssignments={assignments}
      />
    </div>
  )
}
