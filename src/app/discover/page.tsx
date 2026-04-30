// /discover — community surface (login-gated).
// v0.6 redesign: typographic poster grid, activity strip, full-width grid,
// client-side sort/filter. No leaderboard sidebar (writers live elsewhere).
//
// Anuj 2026-04-30.

import { redirect } from 'next/navigation'
import Nav from '@/components/nav'
import { createClient } from '@/lib/supabase-server'
import { createServerClient } from '@supabase/ssr'
import type { ScriptCardData } from '@/components/cards/script-card'
import { getScriptStats } from '@/lib/script-stats'
import { DiscoverGrid, type DiscoverCard } from '@/components/discover/discover-grid'
import { ActivityStrip, type ActivityEvent } from '@/components/discover/activity-strip'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

// Re-render at most every 60s. Was force-dynamic; the latency that gave us
// (re-fetching everything on every tab click) was the bigger UX cost.
export const revalidate = 60

interface PageProps {
  searchParams: Promise<{ sort?: string; format?: string }>
}

export default async function DiscoverPage({ searchParams }: PageProps) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) redirect('/login?redirect=/discover')

  const sp = await searchParams
  const initialSort = (['recent', 'top_gem', 'most_reviewed'].includes(sp.sort || '')
    ? sp.sort
    : 'recent') as 'recent' | 'top_gem' | 'most_reviewed'
  const initialFormat = (['all', 'feature', 'series'].includes(sp.format || '')
    ? sp.format
    : 'all') as 'all' | 'feature' | 'series'

  const service = svc()

  // Pull scripts first, then enrich with evaluations + profiles via separate
  // batched queries. Avoids any PostgREST relation-name ambiguity caused by
  // having multiple tables with FKs to script_submissions.
  const { data: rows } = await service
    .from('script_submissions')
    .select('id, title, declared_format, created_at, user_id')
    .eq('is_public', true)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(200)
  type SubRow = { id: string; title: string; declared_format: string | null; created_at: string; user_id: string | null }
  const scripts = (rows as SubRow[] | null) || []
  const submissionIds = scripts.map((s) => s.id)
  const writerIds = Array.from(new Set(scripts.map((s) => s.user_id).filter(Boolean) as string[]))

  const [{ data: evs }, { data: writers }, stats] = await Promise.all([
    service.from('script_evaluations').select('id, submission_id, weighted_score, evaluation').in('submission_id', submissionIds),
    service.from('profiles').select('id, handle, full_name, avatar_url, headline').in('id', writerIds),
    getScriptStats(submissionIds),
  ])

  type EvalRow = { id: string; weighted_score: number | null; logline: string | null; genre: string | null }
  const evalBySubmission = new Map<string, EvalRow>()
  for (const e of (evs as { id: string; submission_id: string; weighted_score: number | null; evaluation: unknown }[] | null) || []) {
    const evJson = e.evaluation as Record<string, unknown> | null
    const fmt = (evJson?.format_detection as Record<string, unknown> | undefined) || {}
    const cls = (evJson?.classification as Record<string, unknown> | undefined) || {}
    const logline =
      (fmt.logline_one_line as string | undefined) ||
      (evJson?.positioning_hook as string | undefined) ||
      null
    const genre =
      (cls.genre_primary as string | undefined) ||
      (fmt.genre_primary as string | undefined) ||
      null
    evalBySubmission.set(e.submission_id, {
      id: e.id, weighted_score: e.weighted_score, logline, genre,
    })
  }

  type WriterRow = { handle: string | null; full_name: string | null; avatar_url: string | null; headline: string | null }
  type WriterRowWithId = WriterRow & { id: string }
  const writerById = new Map<string, WriterRow>()
  for (const w of (writers as WriterRowWithId[] | null) || []) {
    writerById.set(w.id, { handle: w.handle, full_name: w.full_name, avatar_url: w.avatar_url, headline: w.headline })
  }

  // Build card data (drop scripts with no evaluation).
  const cards: DiscoverCard[] = scripts
    .map((s): DiscoverCard | null => {
      const ev = evalBySubmission.get(s.id)
      if (!ev) return null
      const wp = s.user_id ? writerById.get(s.user_id) : null
      const st = stats.get(s.id)
      const data: ScriptCardData = {
        submission_id: s.id,
        evaluation_id: ev.id,
        title: s.title,
        format: s.declared_format,
        genre: ev.genre,
        logline: ev.logline,
        selznick_score: ev.weighted_score,
        writer_handle: wp?.handle ?? null,
        writer_name: wp?.full_name ?? null,
        writer_avatar_url: wp?.avatar_url ?? null,
        review_count: st?.reviewCount ?? 0,
        avg_peer_score: st?.avgPeerScore ?? null,
      }
      return {
        data,
        recentTs: new Date(s.created_at).getTime(),
        selznick: Number(ev.weighted_score ?? 0),
        reviews: st?.reviewCount ?? 0,
      }
    })
    .filter((c): c is DiscoverCard => c !== null)

  // ---- Activity strip: last 5 publishes + last 5 reviews, merged + sorted ----
  const events: ActivityEvent[] = []
  // Publishes from `cards` (we already have them, recent first).
  for (const c of cards.slice(0, 8)) {
    events.push({
      kind: 'publish',
      ts: c.recentTs,
      title: c.data.title,
      evaluation_id: c.data.evaluation_id,
      writerHandle: c.data.writer_handle,
      writerName: c.data.writer_name,
      writerAvatar: c.data.writer_avatar_url ?? null,
    })
  }
  // Reviews — recent peer_reviews joined with reviewer profile + script title
  const { data: revRows } = await service
    .from('peer_reviews')
    .select('id, submission_id, created_at, reviewer:profiles!peer_reviews_reviewer_id_fkey(handle, full_name, avatar_url)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(8)
  type ReviewRow = {
    id: string
    submission_id: string
    created_at: string
    reviewer: { handle: string | null; full_name: string | null; avatar_url: string | null } | null
  }
  for (const r of (revRows as unknown as ReviewRow[] | null) || []) {
    const sub = scripts.find((s) => s.id === r.submission_id)
    const ev = sub ? evalBySubmission.get(sub.id) : null
    events.push({
      kind: 'review',
      ts: new Date(r.created_at).getTime(),
      title: sub?.title || 'a script',
      evaluation_id: ev?.id ?? null,
      reviewerHandle: r.reviewer?.handle ?? null,
      reviewerName: r.reviewer?.full_name ?? null,
      writerAvatar: r.reviewer?.avatar_url ?? null,
    })
  }
  events.sort((a, b) => b.ts - a.ts)
  const topEvents = events.slice(0, 8)

  return (
    <div className="min-h-screen" style={{ background: '#FAF7F1' }}>
      <Nav />
      <main className="max-w-6xl mx-auto px-5 py-8">
        <header className="mb-6">
          <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-purple-700 mb-2">Discover</p>
          <h1 className="text-[28px] font-bold text-gray-900 leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
            What the GEM community is making.
          </h1>
        </header>

        <ActivityStrip events={topEvents} />

        <DiscoverGrid cards={cards} initialSort={initialSort} initialFormat={initialFormat} />
      </main>
    </div>
  )
}
