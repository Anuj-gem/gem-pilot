// /discover — public browse page for published scripts.
// Placeholder with gated cards until full Discover is built.

import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export default async function DiscoverPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const service = svc()

  // Check Pro status
  let isPro = false
  if (user) {
    const { data: profile } = await service
      .from('profiles')
      .select('subscription_status')
      .eq('id', user.id)
      .single()
    isPro = profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing'
  }

  // Load published scripts
  const { data: published } = await service
    .from('script_submissions')
    .select('id, title, declared_format, heat_score, created_at')
    .eq('is_public', true)
    .eq('status', 'completed')
    .is('hidden_at', null)
    .order('heat_score', { ascending: false })
    .limit(20)

  const scripts = (published || []) as {
    id: string; title: string; declared_format: string | null
    heat_score: number | null; created_at: string
  }[]

  // Get eval scores
  const subIds = scripts.map(s => s.id)
  const evalMap = new Map<string, { id: string; score: number | null }>()
  if (subIds.length > 0) {
    const { data: evs } = await service
      .from('script_evaluations')
      .select('id, submission_id, weighted_score')
      .in('submission_id', subIds)
    for (const e of (evs || []) as any[]) {
      evalMap.set(e.submission_id, { id: e.id, score: e.weighted_score })
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <header className="mb-6">
        <h1 className="text-[22px] font-bold text-gray-900 m-0" style={{ fontFamily: 'Georgia, serif' }}>
          Discover
        </h1>
        <p className="text-[13px] text-gray-400 mt-1 m-0">
          Scripts published by writers on GEM.
        </p>
      </header>

      {scripts.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-10 text-center">
          <p className="text-[15px] font-semibold text-gray-900 m-0 mb-1">No published scripts yet</p>
          <p className="text-[13px] text-gray-400 m-0">
            Scripts will appear here once writers publish their evaluations.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {scripts.map(s => {
            const ev = evalMap.get(s.id)
            return (
              <div key={s.id} className="rounded-xl border border-gray-200 bg-white px-4 py-3 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-gray-900 m-0 truncate">{s.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {s.declared_format && (
                      <span className="text-[11px] font-semibold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                        {s.declared_format}
                      </span>
                    )}
                    {(s.heat_score ?? 0) > 0 && (
                      <span className="text-[12px] font-bold" style={{ color: '#f97316' }}>
                        🔥 {s.heat_score}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {ev?.score != null && (
                    <span className="text-[13px] font-bold text-purple-600">{Math.round(ev.score)}</span>
                  )}
                  {ev?.id && (
                    <Link
                      href={`/report/${ev.id}`}
                      className="text-[12px] font-semibold text-gray-400 hover:text-gray-700 transition-colors"
                    >
                      View
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
