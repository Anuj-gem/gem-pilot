// /w/[handle] — public writer profile.
// Anuj 2026-04-29 (v0.3).

import { notFound } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import Nav from '@/components/nav'
import { WriterCard } from '@/components/writer-card'

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

  // Public scripts (Discover-published) — used as the portfolio surface.
  const { data: scripts } = await service
    .from('script_submissions')
    .select(`
      id, title, created_at, declared_format,
      script_evaluations ( id, weighted_score, tier )
    `)
    .eq('user_id', profile.id)
    .eq('is_public', true)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })

  type Script = {
    id: string; title: string; created_at: string; declared_format: string | null
    script_evaluations: { id: string; weighted_score: number | null; tier: string | null }[] | null
  }
  const publicScripts = (scripts as Script[] | null) || []

  // Reviews received — peer reviews on this writer's scripts
  const { data: receivedRaw } = await service
    .from('peer_reviews')
    .select(`
      id, score, body, suggestion, created_at, reviewer_id, submission_id,
      script_submissions ( id, title, script_evaluations ( id ) ),
      profiles!peer_reviews_reviewer_id_fkey ( id, full_name, handle, headline, avatar_url )
    `)
    .in('submission_id', publicScripts.map((s) => s.id).concat(['00000000-0000-0000-0000-000000000000']))
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(20)
  const reviewsReceived = ((receivedRaw as any[]) || []).map((r) => ({
    id: r.id, score: r.score, body: r.body, suggestion: r.suggestion,
    created_at: r.created_at,
    script: r.script_submissions ? {
      id: r.script_submissions.id, title: r.script_submissions.title,
      eval_id: r.script_submissions.script_evaluations?.[0]?.id ?? null,
    } : null,
    reviewer: r.profiles ? {
      id: r.profiles.id, full_name: r.profiles.full_name, handle: r.profiles.handle,
      headline: r.profiles.headline, avatar_url: r.profiles.avatar_url,
    } : null,
  }))

  // Reviews written — peer reviews this user has authored
  const { data: writtenRaw } = await service
    .from('peer_reviews')
    .select(`
      id, score, body, created_at, submission_id,
      script_submissions ( id, title, script_evaluations ( id ), profiles ( handle, full_name ) )
    `)
    .eq('reviewer_id', profile.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(20)
  const reviewsWritten = ((writtenRaw as any[]) || []).map((r) => ({
    id: r.id, score: r.score, body: r.body, created_at: r.created_at,
    script: r.script_submissions ? {
      id: r.script_submissions.id, title: r.script_submissions.title,
      eval_id: r.script_submissions.script_evaluations?.[0]?.id ?? null,
      writer_handle: r.script_submissions.profiles?.handle ?? null,
      writer_name: r.script_submissions.profiles?.full_name ?? null,
    } : null,
  }))

  // Stats
  const topScore = publicScripts.reduce((m, s) => {
    const w = s.script_evaluations?.[0]?.weighted_score ?? null
    return w != null && w > m ? w : m
  }, 0)
  const stats = {
    publicScripts: publicScripts.length,
    topScore: topScore || null,
    reviewsReceived: reviewsReceived.length,
    reviewsWritten: reviewsWritten.length,
  }

  const displayName = profile.full_name || profile.handle || 'Anonymous writer'
  const initials = displayName.split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? '').join('') || '·'

  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <main className="max-w-3xl mx-auto px-6 py-10">
        {/* Header */}
        <header className="flex items-start gap-5 mb-8">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" className="w-24 h-24 rounded-full object-cover bg-gray-100 shrink-0" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-600 to-purple-400 flex items-center justify-center text-white text-3xl font-bold shrink-0">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-[26px] font-bold text-gray-900 leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
              {displayName}
              <span className="text-gray-400 text-[18px] font-normal ml-2">@{profile.handle}</span>
            </h1>
            {profile.headline && (
              <p className="text-[15px] text-gray-700 mt-1.5 leading-snug">{profile.headline}</p>
            )}
            {profile.bio && (
              <p className="text-[14px] text-gray-600 mt-3 leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
            )}
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              {profile.imdb_url && (
                <a href={profile.imdb_url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-amber-600 hover:text-amber-800">
                  IMDb ↗
                </a>
              )}
              {isOwner && (
                <Link href="/profile" className="text-xs font-semibold text-purple-700 hover:text-purple-900">
                  Edit profile →
                </Link>
              )}
            </div>
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-10">
          <Stat label="Scripts" value={stats.publicScripts} />
          <Stat label="Top score" value={stats.topScore != null ? Math.round(stats.topScore) : '—'} />
          <Stat label="Reviews in" value={stats.reviewsReceived} />
          <Stat label="Reviews out" value={stats.reviewsWritten} />
        </div>

        {/* Public scripts */}
        <Section title="Scripts">
          {publicScripts.length === 0 ? (
            <Empty>No public scripts yet.</Empty>
          ) : (
            <div className="space-y-3">
              {publicScripts.map((s) => {
                const ev = s.script_evaluations?.[0]
                const score = ev?.weighted_score != null ? Math.round(Number(ev.weighted_score)) : null
                return (
                  <Link
                    key={s.id}
                    href={ev ? `/report/${ev.id}` : '#'}
                    className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 hover:bg-gray-50 transition-colors"
                  >
                    {score != null && (
                      <div className="shrink-0 flex flex-col items-center justify-center rounded-lg" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.30)', minWidth: 52, padding: '6px 10px' }}>
                        <span className="text-[8px] uppercase tracking-[0.14em] font-bold text-purple-700">Score</span>
                        <span className="text-lg font-bold text-gray-900 tabular-nums leading-none mt-0.5">{score}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-[15px] font-bold text-gray-900 truncate" style={{ fontFamily: 'Georgia, serif' }}>{s.title}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {s.declared_format ?? '—'}
                        {ev?.tier && <span> · {ev.tier}</span>}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </Section>

        {/* Reviews received */}
        <Section title="Reviews received">
          {reviewsReceived.length === 0 ? (
            <Empty>No reviews yet.</Empty>
          ) : (
            <div className="space-y-3">
              {reviewsReceived.map((r) => (
                <div key={r.id} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    {r.reviewer && (
                      <WriterCard writer={r.reviewer} size="sm" />
                    )}
                    <ScoreBadge score={r.score} />
                  </div>
                  <div className="text-[13px] text-gray-500 mb-2">
                    on{' '}
                    {r.script?.eval_id ? (
                      <Link href={`/report/${r.script.eval_id}`} className="font-semibold text-gray-900 hover:underline">
                        {r.script.title}
                      </Link>
                    ) : (
                      <span className="font-semibold text-gray-900">{r.script?.title ?? 'a script'}</span>
                    )}
                  </div>
                  <p className="text-[14px] text-gray-700 leading-relaxed line-clamp-4">{r.body}</p>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Reviews written */}
        <Section title="Reviews written">
          {reviewsWritten.length === 0 ? (
            <Empty>No reviews written yet.</Empty>
          ) : (
            <div className="space-y-3">
              {reviewsWritten.map((r) => (
                <div key={r.id} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="text-[13px] text-gray-500">
                      Reviewed{' '}
                      {r.script?.eval_id ? (
                        <Link href={`/report/${r.script.eval_id}`} className="font-semibold text-gray-900 hover:underline">
                          {r.script.title}
                        </Link>
                      ) : (
                        <span className="font-semibold text-gray-900">{r.script?.title ?? 'a script'}</span>
                      )}{' '}
                      by{' '}
                      {r.script?.writer_handle ? (
                        <Link href={`/w/${r.script.writer_handle}`} className="font-semibold text-purple-700 hover:underline">
                          {r.script.writer_name || `@${r.script.writer_handle}`}
                        </Link>
                      ) : (
                        <span>{r.script?.writer_name || '—'}</span>
                      )}
                    </div>
                    <ScoreBadge score={r.score} />
                  </div>
                  <p className="text-[14px] text-gray-700 leading-relaxed line-clamp-3">{r.body}</p>
                </div>
              ))}
            </div>
          )}
        </Section>
      </main>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number | string | null }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-3 text-center">
      <div className="text-2xl font-bold text-gray-900 tabular-nums">{value ?? '—'}</div>
      <div className="text-[10px] uppercase tracking-[0.14em] font-bold text-gray-500 mt-1">{label}</div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-[11px] uppercase tracking-[0.18em] font-bold text-gray-500 mb-3">{title}</h2>
      {children}
    </section>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 px-5 py-6 text-center text-sm text-gray-400">
      {children}
    </div>
  )
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <div className="shrink-0 flex flex-col items-center justify-center rounded" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.30)', minWidth: 44, padding: '3px 8px' }}>
      <span className="text-[8px] uppercase tracking-[0.14em] font-bold text-purple-700 leading-none">Score</span>
      <span className="text-[15px] font-bold text-gray-900 tabular-nums leading-none mt-0.5">{score}</span>
    </div>
  )
}
