// /discover — community feed of recent public scripts (login-gated).
// Anuj 2026-04-29 (v0.4 revival).

import { redirect } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/nav'
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
  const { data: rows } = await service
    .from('script_submissions')
    .select(`
      id, title, declared_format, created_at, user_id,
      script_evaluations ( id, weighted_score ),
      profiles ( handle, full_name, avatar_url, headline )
    `)
    .eq('is_public', true)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(60)

  type Row = {
    id: string; title: string; declared_format: string | null
    created_at: string; user_id: string | null
    script_evaluations: { id: string; weighted_score: number | null }[] | null
    profiles: { handle: string | null; full_name: string | null; avatar_url: string | null; headline: string | null } | null
  }
  const scripts = (rows as Row[] | null) || []

  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <main className="max-w-3xl mx-auto px-6 py-10">
        <header className="mb-7">
          <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-purple-700 mb-2">Discover</p>
          <h1 className="text-[28px] font-bold text-gray-900 leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
            What writers are publishing on GEM.
          </h1>
          <p className="text-[14px] text-gray-600 mt-2">
            Most recent first. Click a script to read its report. Click a writer's handle to follow them.
          </p>
        </header>

        {scripts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center text-sm text-gray-400">
            No public scripts yet.
          </div>
        ) : (
          <div className="space-y-2">
            {scripts.map((s) => {
              const ev = s.script_evaluations?.[0]
              const score = ev?.weighted_score != null ? Math.round(Number(ev.weighted_score)) : null
              const handle = s.profiles?.handle
              return (
                <Link
                  key={s.id}
                  href={ev ? `/report/${ev.id}` : '#'}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  {score != null ? (
                    <div
                      className="shrink-0 w-12 h-12 rounded-lg flex items-center justify-center text-white font-extrabold text-[17px]"
                      style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
                    >
                      {score}
                    </div>
                  ) : (
                    <div className="shrink-0 w-12 h-12 rounded-lg bg-gray-100" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-900 truncate" style={{ fontFamily: 'Georgia, serif', fontSize: 15 }}>
                      {s.title}
                    </div>
                    <div className="text-[12px] text-gray-500 mt-0.5 truncate">
                      {s.declared_format || '—'}
                      {handle && (
                        <>
                          <span> · by </span>
                          <span className="text-purple-700 font-semibold">@{handle}</span>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
