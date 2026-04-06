import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const alt = 'GEM Script Evaluation'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

type ReportData = {
  title: string
  score: number | null
  tier: string | null
  rank: number | null
  totalPublic: number | null
  bestScore: number | null
}

// Service-role key bypasses RLS — safe here because this runs server-side
// in the edge runtime and the key is never sent to the client.
async function getReportData(id: string): Promise<ReportData> {
  const fallback: ReportData = {
    title: 'Screenplay',
    score: null,
    tier: null,
    rank: null,
    totalPublic: null,
    bestScore: null,
  }
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { data: evalRow } = await supabase
      .from('script_evaluations')
      .select('weighted_score, tier, submission_id')
      .eq('id', id)
      .single()

    if (!evalRow) return fallback

    const submissionId = (evalRow as any).submission_id as string
    const score =
      typeof (evalRow as any).weighted_score === 'number'
        ? (evalRow as any).weighted_score
        : (evalRow as any).weighted_score !== null
        ? Number((evalRow as any).weighted_score)
        : null
    const tier = ((evalRow as any).tier as string) ?? null

    const { data: subRow } = await supabase
      .from('script_submissions')
      .select('title, user_id, is_public')
      .eq('id', submissionId)
      .single()

    const title = ((subRow as any)?.title as string) ?? fallback.title
    const userId = ((subRow as any)?.user_id as string | null) ?? null
    const isPublic = Boolean((subRow as any)?.is_public)

    // Leaderboard rank — only if this script is on the leaderboard
    let rank: number | null = null
    let totalPublic: number | null = null
    if (isPublic && score !== null) {
      const { data: publicScores } = await supabase
        .from('script_evaluations')
        .select('weighted_score, submission_id, script_submissions!inner(is_public)')
        .eq('script_submissions.is_public', true)
        .not('weighted_score', 'is', null)

      if (Array.isArray(publicScores)) {
        const scores = publicScores
          .map((r: any) => Number(r.weighted_score))
          .filter((n) => !Number.isNaN(n))
        totalPublic = scores.length
        rank = scores.filter((s) => s > score).length + 1
      }
    }

    // User's best score so far (only if we have a user_id)
    let bestScore: number | null = null
    if (userId) {
      const { data: userEvals } = await supabase
        .from('script_evaluations')
        .select('weighted_score, script_submissions!inner(user_id)')
        .eq('script_submissions.user_id', userId)
        .not('weighted_score', 'is', null)

      if (Array.isArray(userEvals) && userEvals.length > 0) {
        const nums = userEvals
          .map((r: any) => Number(r.weighted_score))
          .filter((n) => !Number.isNaN(n))
        if (nums.length > 0) bestScore = Math.max(...nums)
      }
    }

    return { title, score, tier, rank, totalPublic, bestScore }
  } catch {
    return fallback
  }
}

function tierColor(tier: string | null) {
  if (tier === 'Greenlight Material') return '#16a34a'
  if (tier === 'Optionable') return '#3b82f6'
  if (tier === 'Needs Development') return '#f59e0b'
  return '#a78bfa'
}

export default async function ReportOpengraphImage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string }
}) {
  const resolved = await Promise.resolve(params as any)
  const id = (resolved?.id as string) ?? ''
  const { title, score, tier, rank, totalPublic, bestScore } = await getReportData(id)
  const color = tierColor(tier)
  const scoreDisplay = score !== null ? Math.round(score).toString() : '—'

  const isBest =
    score !== null && bestScore !== null && Math.round(score) >= Math.round(bestScore)
  const showRank = rank !== null && totalPublic !== null && totalPublic > 1

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '64px 72px',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0b2e 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: '#ffffff',
        }}
      >
        {/* Top row — wordmark + optional best-score badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 40,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              fontSize: 32,
              fontWeight: 800,
              letterSpacing: 4,
              color: '#ffffff',
            }}
          >
            GEM
          </div>
          {isBest && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 20px',
                borderRadius: 999,
                background: 'rgba(250, 204, 21, 0.15)',
                border: '2px solid #facc15',
                color: '#facc15',
                fontSize: 20,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 2,
              }}
            >
              ★ Best score yet
            </div>
          )}
        </div>

        {/* Main content — score left, title right */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 56,
          }}
        >
          {/* Score block */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: 300,
              height: 300,
              borderRadius: 24,
              background: 'rgba(255,255,255,0.04)',
              border: `3px solid ${color}`,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                fontSize: 168,
                fontWeight: 900,
                lineHeight: 1,
                color: color,
                display: 'flex',
              }}
            >
              {scoreDisplay}
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 3,
                color: '#9ca3af',
                marginTop: 12,
                display: 'flex',
              }}
            >
              GEM Score
            </div>
          </div>

          {/* Title + tier + rank */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              flex: 1,
              gap: 20,
            }}
          >
            <div
              style={{
                fontSize: 60,
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: -1,
                color: '#ffffff',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {title}
            </div>
            {tier && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 26px',
                  borderRadius: 999,
                  background: color,
                  color: '#ffffff',
                  fontSize: 24,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: 2,
                  alignSelf: 'flex-start',
                }}
              >
                {tier}
              </div>
            )}
            {showRank && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: 22,
                  color: '#e5e7eb',
                  fontWeight: 600,
                }}
              >
                Ranked #{rank} of {totalPublic} on the GEM leaderboard
              </div>
            )}
          </div>
        </div>

        {/* Footer — persistent CTA */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 22,
            color: '#9ca3af',
            marginTop: 28,
            paddingTop: 24,
            borderTop: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div style={{ display: 'flex', color: '#9ca3af' }}>gem.studio</div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px 22px',
              borderRadius: 999,
              background: '#7c3aed',
              color: '#ffffff',
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            Get your script read in 60 seconds →
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
