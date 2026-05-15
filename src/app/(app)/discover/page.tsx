// /discover — shows scripts published to Discover.
//
// Own scripts: full details (title, format, genre, score, link to report).
// Other people's scripts: title + format only (blurred/minimal).
//
// Anuj 2026-05-14 v0.2.

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export const dynamic = 'force-dynamic'

export default async function DiscoverPage() {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) redirect('/login?redirect=/discover')

  const service = svc()

  // Only show scripts that have is_public = true
  const { data: rows } = await service
    .from('script_submissions')
    .select('id, title, declared_format, user_id, created_at')
    .eq('status', 'completed')
    .eq('is_public', true)
    .is('hidden_at', null)
    .order('created_at', { ascending: false })
    .limit(50)

  type SubRow = {
    id: string
    title: string
    declared_format: string | null
    user_id: string | null
    created_at: string
  }
  const scripts = (rows as SubRow[] | null) || []
  const submissionIds = scripts.map(s => s.id)

  // Fetch evaluations for score + genre
  const evalBySubmission = new Map<string, { id: string; score: number | null; genre: string | null }>()
  if (submissionIds.length > 0) {
    const { data: evs } = await service
      .from('script_evaluations')
      .select('id, submission_id, weighted_score, evaluation')
      .in('submission_id', submissionIds)
    for (const e of (evs as { id: string; submission_id: string; weighted_score: number | null; evaluation: unknown }[] | null) || []) {
      const evJson = e.evaluation as Record<string, unknown> | null
      const cls = (evJson?.classification as Record<string, unknown> | undefined) || {}
      const genre = (cls.genre_primary as string | undefined) || null
      evalBySubmission.set(e.submission_id, { id: e.id, score: e.weighted_score, genre })
    }
  }

  // Split into own vs others
  const ownScripts = scripts.filter(s => s.user_id === user.id)
  const otherScripts = scripts.filter(s => s.user_id !== user.id)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-gray-900" style={{ fontFamily: 'Georgia, serif' }}>Discover</h1>
        <p className="mt-1 text-[13px] text-gray-400">Scripts published by the GEM community.</p>
      </div>

      {scripts.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center">
          <p className="text-[14px] text-gray-500 m-0 mb-1">No scripts published yet.</p>
          <p className="text-[13px] text-gray-400 m-0">Publish your scripts from the three-dot menu on the Scripts page.</p>
        </div>
      )}

      {/* Own scripts — full details */}
      {ownScripts.length > 0 && (
        <div className="mb-6">
          <h2 className="text-[13px] font-bold text-gray-500 uppercase tracking-wide mb-3">Your scripts</h2>
          <div className="space-y-2">
            {ownScripts.map(s => {
              const ev = evalBySubmission.get(s.id)
              return (
                <div key={s.id} className="rounded-xl border border-gray-200 bg-white px-4 py-3.5 hover:border-purple-200 transition-colors">
                  <div className="flex items-center gap-3">
                    {ev?.score != null && (
                      <div
                        className="shrink-0 w-11 h-11 rounded-lg flex flex-col items-center justify-center"
                        style={{ background: '#f3f4f6', border: '1.5px solid #e5e7eb' }}
                      >
                        <span className="text-[16px] font-extrabold leading-none text-gray-800">{Math.round(ev.score)}</span>
                        <span className="text-[7px] font-bold uppercase tracking-wide mt-0.5 text-gray-400">Score</span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-bold text-gray-900 m-0 truncate" style={{ fontFamily: 'Georgia, serif' }}>{s.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {s.declared_format && <span className="text-[12px] text-gray-400">{s.declared_format}</span>}
                        {ev?.genre && <><span className="text-[12px] text-gray-300">·</span><span className="text-[12px] text-gray-400">{ev.genre}</span></>}
                      </div>
                    </div>
                    {ev && (
                      <Link
                        href={`/report/${ev.id}`}
                        className="text-[12px] font-semibold text-purple-600 hover:text-purple-800 whitespace-nowrap"
                      >
                        View report →
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Other scripts — title + format only */}
      {otherScripts.length > 0 && (
        <div>
          {ownScripts.length > 0 && (
            <h2 className="text-[13px] font-bold text-gray-500 uppercase tracking-wide mb-3">Community</h2>
          )}
          <div className="space-y-2">
            {otherScripts.map(s => (
              <div key={s.id} className="rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="shrink-0 w-11 h-11 rounded-lg flex items-center justify-center" style={{ background: '#f3f4f6' }}>
                    <span className="text-[11px] text-gray-300">&mdash;</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium text-gray-600 m-0 truncate">{s.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {s.declared_format && <span className="text-[12px] text-gray-400">{s.declared_format}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
