// /discover — community surface (login-gated).
// Two columns: most prolific writers + most recent posts.
// Anuj 2026-04-29 (v0.4 revival, two-column).

import { redirect } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/nav'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import { ScriptCard, type ScriptCardData } from '@/components/cards/script-card'
import { getScriptStats } from '@/lib/script-stats'

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

  // Recent posts — most recent public scripts (with their evaluation id so we
  // can link straight to the report).
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
    .limit(40)

  type Row = {
    id: string; title: string; declared_format: string | null
    created_at: string; user_id: string | null
    script_evaluations: { id: string; weighted_score: number | null }[] | null
    profiles: { handle: string | null; full_name: string | null; avatar_url: string | null; headline: string | null } | null
  }
  const scripts = (rows as Row[] | null) || []

  // Batch-fetch community stats for the recent scripts
  const stats = await getScriptStats(scripts.map((s) => s.id))

  // Most prolific writers — top by count of public scripts. Computed
  // client-side from the same recent-posts pull plus a wider count query
  // so the leaderboard reflects ALL public scripts, not just recent ones.
  const { data: allPublic } = await service
    .from('script_submissions')
    .select('user_id, profiles ( handle, full_name, avatar_url, headline )')
    .eq('is_public', true)
    .eq('status', 'completed')
    .limit(2000)

  type ProWriter = {
    id: string
    handle: string | null
    full_name: string | null
    avatar_url: string | null
    headline: string | null
    count: number
  }
  const byUser = new Map<string, ProWriter>()
  for (const r of (allPublic as any[] | null) || []) {
    if (!r.user_id || !r.profiles) continue
    const cur = byUser.get(r.user_id)
    if (cur) {
      cur.count += 1
    } else {
      byUser.set(r.user_id, {
        id: r.user_id,
        handle: r.profiles.handle ?? null,
        full_name: r.profiles.full_name ?? null,
        avatar_url: r.profiles.avatar_url ?? null,
        headline: r.profiles.headline ?? null,
        count: 1,
      })
    }
  }
  const prolific = Array.from(byUser.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)

  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <header className="mb-8">
          <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-purple-700 mb-2">Discover</p>
          <h1 className="text-[28px] font-bold text-gray-900 leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
            What writers are publishing on GEM.
          </h1>
          <p className="text-[14px] text-gray-600 mt-2">
            Click a writer to see their full profile. Click a post to read the report.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-8">
          {/* Most prolific writers */}
          <aside>
            <div className="text-[11px] font-bold tracking-[0.16em] uppercase text-gray-500 mb-3">Most prolific writers</div>
            {prolific.length === 0 ? (
              <Empty>No writers have published yet.</Empty>
            ) : (
              <div className="space-y-1">
                {prolific.map((w) => {
                  const initials = (w.full_name || w.handle || '·').split(/\s+/).slice(0,2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '·'
                  return (
                    <Link
                      key={w.id}
                      href={w.handle ? `/w/${w.handle}` : '#'}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {w.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={w.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover bg-gray-100" />
                      ) : (
                        <div className="w-9 h-9 rounded-full text-white flex items-center justify-center font-bold text-[12px]" style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}>{initials}</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[13.5px] text-gray-900 truncate">
                          {w.full_name || w.handle}{' '}
                          <span className="text-gray-400 font-normal text-[12px]">@{w.handle}</span>
                        </div>
                        <div className="text-[11.5px] text-gray-500">
                          {w.count} {w.count === 1 ? 'script' : 'scripts'}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </aside>

          {/* Recent posts */}
          <section>
            <div className="text-[11px] font-bold tracking-[0.16em] uppercase text-gray-500 mb-3">Recent</div>
            {scripts.length === 0 ? (
              <Empty>No public scripts yet.</Empty>
            ) : (
              <div className="space-y-1">
                {scripts.map((s) => {
                  const ev = s.script_evaluations?.[0]
                  const st = stats.get(s.id)
                  const cardData: ScriptCardData = {
                    submission_id: s.id,
                    evaluation_id: ev?.id ?? null,
                    title: s.title,
                    format: s.declared_format,
                    selznick_score: ev?.weighted_score ?? null,
                    writer_handle: s.profiles?.handle ?? null,
                    writer_name: s.profiles?.full_name ?? null,
                    review_count: st?.reviewCount ?? 0,
                    avg_peer_score: st?.avgPeerScore ?? null,
                  }
                  return <ScriptCard key={s.id} s={cardData} density="list" />
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 px-5 py-6 text-center text-sm text-gray-400">{children}</div>
  )
}
