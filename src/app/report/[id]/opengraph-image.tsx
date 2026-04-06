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
}

async function getReportData(id: string): Promise<ReportData> {
  const fallback: ReportData = { title: 'Screenplay', score: null, tier: null }
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data } = await supabase
      .from('script_evaluations')
      .select('weighted_score, tier, script_submissions(title)')
      .eq('id', id)
      .single()

    if (!data) return fallback
    const sub = Array.isArray((data as any).script_submissions)
      ? (data as any).script_submissions[0]
      : (data as any).script_submissions
    return {
      title: sub?.title ?? fallback.title,
      score: typeof (data as any).weighted_score === 'number' ? (data as any).weighted_score : null,
      tier: (data as any).tier ?? null,
    }
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

export default async function ReportOpengraphImage({ params }: { params: { id: string } }) {
  const { title, score, tier } = await getReportData(params.id)
  const color = tierColor(tier)
  const scoreDisplay = score !== null ? Math.round(score).toString() : '—'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '72px 80px',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0b2e 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: '#ffffff',
        }}
      >
        {/* Wordmark */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: 32,
            fontWeight: 800,
            letterSpacing: 4,
            color: '#ffffff',
            marginBottom: 48,
          }}
        >
          GEM
        </div>

        {/* Main content — score left, title right */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 64,
          }}
        >
          {/* Score block */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: 320,
              height: 320,
              borderRadius: 24,
              background: 'rgba(255,255,255,0.04)',
              border: `3px solid ${color}`,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                fontSize: 180,
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

          {/* Title + tier */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              flex: 1,
              gap: 24,
            }}
          >
            <div
              style={{
                fontSize: 64,
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
                  padding: '14px 28px',
                  borderRadius: 999,
                  background: color,
                  color: '#ffffff',
                  fontSize: 26,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: 2,
                  alignSelf: 'flex-start',
                }}
              >
                {tier}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 22,
            color: '#9ca3af',
            marginTop: 32,
            paddingTop: 24,
            borderTop: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div style={{ display: 'flex' }}>gem.studio</div>
          <div style={{ display: 'flex' }}>AI Screenplay Evaluation</div>
        </div>
      </div>
    ),
    { ...size }
  )
}
