// Landing page — v21 (2026-06-03).
//
// Hero → Position → Build Team → Find Funding → Network → Opportunities → Discover → Pro + Final CTA.
// Solid deep purple background #2b1a55.
// Opportunities and Discover sections use real data from Supabase.

import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { LandingTracking } from '@/components/landing-tracking'
import { LandingNav } from '@/components/landing/landing-nav'
import { LandingPageV21 } from '@/components/landing/landing-page-v21'
import { ScriptUploadModal } from '@/components/script-upload-modal'
import { SiteFooter } from '@/components/site-footer'
import { createClient } from '@/lib/supabase-server'
import type { OpportunityCardProps } from '@/components/opportunities/opportunity-card'
import type { LeaderboardCard } from '@/components/discover/leaderboard-cards'

function svc() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export const revalidate = 60

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>
}) {
  // OAuth safety net — forward dangling ?code= to /auth/callback.
  const sp = await searchParams
  if (sp.code) {
    redirect(`/auth/callback?code=${encodeURIComponent(sp.code)}&next=/onboarding`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  const service = svc()

  // ── Fetch 6 most recent active opportunities ──────────────────────
  const { data: oppsRaw } = await service
    .from('opportunities')
    .select('id, slug, title, subtitle, description, genres, formats, created_at, deadline, status, deal_type')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(6)

  const opportunities: OpportunityCardProps[] = ((oppsRaw || []) as {
    id: string; slug: string | null; title: string; subtitle: string | null
    description: string | null; genres: string[] | null; formats: string[] | null
    created_at: string; deadline: string | null; status: string; deal_type: string | null
  }[]).map(o => ({
    id: o.id,
    slug: o.slug,
    title: o.title,
    subtitle: o.subtitle,
    description: o.description,
    genres: o.genres || [],
    formats: o.formats || [],
    createdAt: o.created_at,
    deadline: o.deadline,
    status: 'available' as const,
    matchingScriptCount: 0,
    isAnon: true,
    dealType: o.deal_type,
  }))

  // ── Fetch 3 most recent public scripts with media ─────────────────
  let discoverScripts: LeaderboardCard[] = []

  // First try: scripts with media
  const { data: scriptsWithMedia } = await service
    .from('script_submissions')
    .select('id, title, declared_format, user_id, poster_url, heat_score, created_at, media_urls')
    .eq('is_public', true)
    .eq('status', 'completed')
    .not('media_urls', 'is', null)
    .neq('media_urls', '[]')
    .order('created_at', { ascending: false })
    .limit(3)

  let targetScripts = ((scriptsWithMedia || []) as any[])

  // Fallback: any 3 public completed scripts
  if (targetScripts.length < 3) {
    const { data: fallback } = await service
      .from('script_submissions')
      .select('id, title, declared_format, user_id, poster_url, heat_score, created_at, media_urls')
      .eq('is_public', true)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(3)
    targetScripts = ((fallback || []) as any[])
  }

  if (targetScripts.length > 0) {
    const subIds = targetScripts.map((s: any) => s.id)
    const writerIds = Array.from(new Set(targetScripts.map((s: any) => s.user_id).filter(Boolean) as string[]))

    const [{ data: evs }, { data: writers }] = await Promise.all([
      service
        .from('script_evaluations')
        .select('id, submission_id, weighted_score, genre_cls:evaluation->classification->>genre_primary')
        .in('submission_id', subIds),
      service
        .from('profiles')
        .select('id, handle, full_name, avatar_url, headline')
        .in('id', writerIds),
    ])

    const evalBySubmission = new Map<string, { evalId: string; score: number | null; genre: string | null }>()
    for (const e of (evs as { id: string; submission_id: string; weighted_score: number | null; genre_cls: string | null }[] | null) || []) {
      evalBySubmission.set(e.submission_id, { evalId: e.id, score: e.weighted_score, genre: e.genre_cls })
    }

    type WriterRow = { id: string; handle: string | null; full_name: string | null; avatar_url: string | null; headline: string | null }
    const writerById = new Map<string, WriterRow>()
    for (const w of (writers as WriterRow[] | null) || []) {
      writerById.set(w.id, w)
    }

    discoverScripts = targetScripts.map((s: any) => {
      const ev = evalBySubmission.get(s.id)
      const writer = s.user_id ? writerById.get(s.user_id) : null
      const format = s.declared_format === 'Feature film' ? 'Feature' : (s.declared_format || null)
      return {
        submissionId: s.id,
        evaluationId: ev?.evalId ?? s.id,
        title: s.title || 'Untitled',
        format,
        genre: ev?.genre || null,
        genreKey: ev?.genre ? ev.genre.toLowerCase().replace(/[^a-z]/g, '') : null,
        budget: null,
        score: ev?.score ?? null,
        scoreVisible: true,
        heat: s.heat_score ?? 0,
        scoreRank: null,
        heatRank: null,
        posterUrl: s.poster_url || null,
        createdAt: s.created_at,
        reviewCount: 0,
        avgPeerScore: null,
        collaboratorCount: 0,
        collaborators: [],
        writer: writer ? { handle: writer.handle, fullName: writer.full_name, avatarUrl: writer.avatar_url, headline: writer.headline } : null,
      } satisfies LeaderboardCard
    })
  }

  return (
    <div className="min-h-screen text-white" style={{ background: '#2b1a55' }}>
      <LandingTracking />
      <LandingNav />

      <LandingPageV21 opportunities={opportunities} discoverScripts={discoverScripts} />

      <SiteFooter />
      <ScriptUploadModal redirectTo="/evaluating" />
    </div>
  )
}
