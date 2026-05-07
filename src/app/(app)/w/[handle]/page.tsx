// /w/[handle] — public writer profile.
// Redesign 2026-05-07: clean portfolio page, no scores, no dead social features.

import { notFound } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import Nav from '@/components/nav'

interface PageProps { params: Promise<{ handle: string }> }

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export default async function PublicProfile({ params }: PageProps) {
  const { handle } = await params
  const service = svc()
  const auth = await createClient()
  const { data: { user: viewer } } = await auth.auth.getUser()

  const { data: profile } = await service
    .from('profiles')
    .select('id, full_name, handle, headline, bio, imdb_url, avatar_url, created_at')
    .ilike('handle', handle)
    .maybeSingle<{
      id: string; full_name: string | null; handle: string | null
      headline: string | null; bio: string | null; imdb_url: string | null
      avatar_url: string | null; created_at: string
    }>()
  if (!profile) notFound()

  const isOwner = viewer?.id === profile.id

  // Public scripts
  const { data: subs } = await service
    .from('script_submissions')
    .select('id, title, created_at, declared_format')
    .eq('user_id', profile.id)
    .eq('is_public', true)
    .eq('status', 'completed')
    .is('hidden_at', null)
    .order('created_at', { ascending: false })
  type SubRow = { id: string; title: string; created_at: string; declared_format: string | null }
  const subRows = (subs as SubRow[] | null) || []

  // Evaluations — for genre extraction only (no scores displayed)
  type EvalRow = { id: string; submission_id: string; evaluation: unknown }
  const evalBySub = new Map<string, EvalRow>()
  if (subRows.length > 0) {
    const { data: evs } = await service
      .from('script_evaluations')
      .select('id, submission_id, evaluation')
      .in('submission_id', subRows.map(s => s.id))
    for (const e of (evs as EvalRow[] | null) || []) evalBySub.set(e.submission_id, e)
  }

  // Build script list with genre
  const scripts = subRows.map(s => {
    const ev = evalBySub.get(s.id)
    const evJson = ev?.evaluation as Record<string, unknown> | null
    const cls = (evJson?.classification as Record<string, unknown>) || {}
    const fmt = (evJson?.format_detection as Record<string, unknown>) || {}
    const genre = (cls.genre_primary as string) || (fmt.genre_primary as string) || null
    return {
      id: s.id,
      evalId: ev?.id ?? null,
      title: s.title,
      format: s.declared_format,
      genre,
      createdAt: s.created_at,
    }
  })

  // Auto-derive genre/format focus from their scripts
  const genreCounts = new Map<string, number>()
  const formatCounts = new Map<string, number>()
  for (const s of scripts) {
    if (s.genre) genreCounts.set(s.genre, (genreCounts.get(s.genre) ?? 0) + 1)
    if (s.format) formatCounts.set(s.format, (formatCounts.get(s.format) ?? 0) + 1)
  }
  const topGenres = [...genreCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([g]) => g)
  const topFormats = [...formatCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([f]) => f)

  const displayName = profile.full_name || profile.handle || 'Anonymous writer'
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase() ?? '')
    .join('') || '·'

  // Member since
  const memberSince = new Date(profile.created_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <main className="max-w-2xl mx-auto px-6 py-10">

        {/* ── PROFILE HEADER ── */}
        <div className="mb-8">
          <div className="flex items-start gap-5">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt=""
                className="w-20 h-20 rounded-full object-cover bg-gray-100 shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-purple-400 flex items-center justify-center text-white text-2xl font-bold shrink-0">
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0 pt-1">
              <h1
                className="text-[26px] font-bold text-gray-900 leading-tight"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                {displayName}
              </h1>
              {profile.headline && (
                <p className="text-[14px] text-gray-600 mt-1 leading-snug">{profile.headline}</p>
              )}
              <div className="flex items-center gap-2.5 mt-2.5 flex-wrap">
                <span className="text-[12px] text-gray-400">Member since {memberSince}</span>
                {profile.imdb_url && (
                  <>
                    <span className="text-gray-200">&middot;</span>
                    <a
                      href={profile.imdb_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] font-semibold text-gray-500 hover:text-gray-900 transition-colors"
                    >
                      IMDb ↗
                    </a>
                  </>
                )}
                {isOwner && (
                  <>
                    <span className="text-gray-200">&middot;</span>
                    <Link
                      href="/profile"
                      className="text-[12px] font-semibold text-purple-600 hover:text-purple-800 transition-colors"
                    >
                      Edit profile
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-[14px] text-gray-600 mt-5 leading-relaxed whitespace-pre-wrap">
              {profile.bio}
            </p>
          )}

          {/* Genre/format focus tags */}
          {(topGenres.length > 0 || topFormats.length > 0) && (
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              {topFormats.map(f => (
                <span
                  key={f}
                  className="text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full"
                >
                  {f}
                </span>
              ))}
              {topGenres.map(g => (
                <span
                  key={g}
                  className="text-[11px] font-bold uppercase tracking-[0.08em] text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full"
                >
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── SCRIPTS ── */}
        <section>
          <h2 className="text-[12px] uppercase tracking-[0.14em] font-bold text-gray-400 mb-3">
            Scripts{scripts.length > 0 ? ` (${scripts.length})` : ''}
          </h2>

          {scripts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white px-5 py-8 text-center">
              <p className="text-[13px] text-gray-400 m-0">No published scripts yet.</p>
            </div>
          ) : (
            <div className="rounded-xl bg-white border border-gray-200 divide-y divide-gray-100 overflow-hidden">
              {scripts.map(s => (
                <div key={s.id} className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold text-gray-900 m-0 truncate">
                        {s.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {s.format && (
                          <span className="text-[12px] text-gray-400">{s.format}</span>
                        )}
                        {s.genre && (
                          <>
                            {s.format && <span className="text-gray-200">&middot;</span>}
                            <span className="text-[12px] text-gray-400">{s.genre}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {s.evalId && (
                      <Link
                        href={`/report/${s.evalId}`}
                        className="shrink-0 text-[12px] font-semibold text-purple-600 hover:text-purple-800 transition-colors"
                      >
                        View →
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>
    </div>
  )
}
