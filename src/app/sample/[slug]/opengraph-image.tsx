import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const alt = 'GEM Sample Report'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

type SampleData = {
  title: string
  author: string | null
  year: number | null
  type: string | null
  score: number | null
  tier: string | null
}

async function getSampleData(slug: string): Promise<SampleData> {
  const fallback: SampleData = {
    title: 'Sample Screenplay',
    author: null,
    year: null,
    type: null,
    score: null,
    tier: null,
  }
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { data: subRow } = await supabase
      .from('script_submissions')
      .select('id, title, sample_author, sample_year, sample_type')
      .eq('is_sample', true)
      .eq('sample_slug', slug)
      .single()

    if (!subRow) return fallback

    const { data: evalRow } = await supabase
      .from('script_evaluations')
      .select('weighted_score, tier')
      .eq('submission_id', (subRow as any).id)
      .single()

    const score =
      evalRow && (evalRow as any).weighted_score !== null
        ? Number((evalRow as any).weighted_score)
        : null
    const tier = ((evalRow as any)?.tier as string) ?? null

    return {
      title: ((subRow as any).title as string) ?? fallback.title,
      author: ((subRow as any).sample_author as string | null) ?? null,
      year: ((subRow as any).sample_year as number | null) ?? null,
      type: ((subRow as any).sample_type as string | null) ?? null,
      score,
      tier,
    }
  } catch {
    return fallback
  }
}

function tierLabel(tier: string | null): string {
  if (tier === 'Optionable') return 'Option Ready'
  if (tier === 'Needs Development') return 'Shows Promise'
  if (tier === 'Greenlight Material') return 'Greenlight Material'
  return tier ?? ''
}

function tierGradient(tier: string | null): { c1: string; c2: string; rgb: string } {
  if (tier === 'Greenlight Material') return { c1: '#16a34a', c2: '#15803d', rgb: '22, 163, 74' }
  if (tier === 'Needs Development') return { c1: '#f59e0b', c2: '#d97706', rgb: '245, 158, 11' }
  return { c1: '#3b82f6', c2: '#2563eb', rgb: '59, 130, 246' }
}

export default async function SampleOpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string }
}) {
  const resolved = await Promise.resolve(params as any)
  const slug = (resolved?.slug as string) ?? ''
  const { title, author, year, type, score, tier } = await getSampleData(slug)

  const scoreDisplay = score !== null ? Math.round(score).toString() : '—'
  const tierText = tierLabel(tier)
  const grad = tierGradient(tier)

  // Truncate long titles (satori does not support line clamp)
  const MAX_TITLE_LEN = 80
  const displayTitle = title.length > MAX_TITLE_LEN ? title.slice(0, MAX_TITLE_LEN - 1) + '…' : title
  const titleLen = displayTitle.length
  const titleFontSize = titleLen > 60 ? 52 : titleLen > 40 ? 62 : titleLen > 24 ? 72 : 80

  const bylineParts: string[] = []
  if (author) bylineParts.push(author)
  if (year) bylineParts.push(String(year))
  if (type) bylineParts.push(type)
  const byline = bylineParts.join(' · ')

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '64px 80px',
          background:
            'radial-gradient(ellipse at top right, rgba(124, 58, 237, 0.32) 0%, transparent 55%), radial-gradient(ellipse at bottom left, rgba(124, 58, 237, 0.18) 0%, transparent 55%), linear-gradient(135deg, #0a0a0a 0%, #1a0b2e 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: '#ffffff',
          position: 'relative',
        }}
      >
        {/* Top bar — wordmark + GEM SAMPLE badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 18,
                height: 18,
                background: '#7c3aed',
                transform: 'rotate(45deg)',
                display: 'flex',
              }}
            />
            <div
              style={{
                fontSize: 36,
                fontWeight: 900,
                letterSpacing: 6,
                color: '#ffffff',
                display: 'flex',
              }}
            >
              GEM
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: 4,
              textTransform: 'uppercase',
              color: '#ffffff',
              padding: '12px 24px',
              border: '1.5px solid rgba(167, 139, 250, 0.6)',
              borderRadius: 999,
              background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.25) 0%, rgba(124, 58, 237, 0.35) 100%)',
            }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                background: '#7c3aed',
                transform: 'rotate(45deg)',
                display: 'flex',
              }}
            />
            GEM Sample
          </div>
        </div>

        {/* Hero */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '0 20px',
          }}
        >
          <div
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: titleFontSize,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -1.5,
              color: '#ffffff',
              marginBottom: 20,
              display: 'flex',
              textAlign: 'center',
              maxWidth: 1000,
            }}
          >
            &ldquo;{displayTitle}&rdquo;
          </div>
          {byline && (
            <div
              style={{
                fontSize: 26,
                fontWeight: 400,
                color: '#9ca3af',
                fontStyle: 'italic',
                marginBottom: 36,
                display: 'flex',
              }}
            >
              {byline}
            </div>
          )}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 28,
              marginTop: byline ? 0 : 24,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                padding: '14px 28px',
                borderRadius: 16,
                background: 'rgba(255,255,255,0.06)',
                border: '2px solid rgba(255,255,255,0.14)',
              }}
            >
              <div
                style={{
                  fontSize: 72,
                  fontWeight: 900,
                  color: '#ffffff',
                  lineHeight: 1,
                  letterSpacing: -2,
                  display: 'flex',
                }}
              >
                {scoreDisplay}
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 600,
                  color: '#9ca3af',
                  marginLeft: 4,
                  display: 'flex',
                }}
              >
                /100
              </div>
            </div>
            {tierText && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '18px 30px',
                  borderRadius: 999,
                  fontSize: 22,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: 2.5,
                  background: `linear-gradient(135deg, ${grad.c1} 0%, ${grad.c2} 100%)`,
                  color: '#ffffff',
                  boxShadow: `0 8px 32px rgba(${grad.rgb}, 0.35)`,
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: '#ffffff',
                    marginRight: 10,
                    display: 'flex',
                  }}
                />
                {tierText}
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
            paddingTop: 28,
            borderTop: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: '#e5e7eb',
              display: 'flex',
            }}
          >
            See how GEM reads a produced screenplay
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 22px',
              borderRadius: 999,
              background: '#7c3aed',
              color: '#ffffff',
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: 0.5,
              boxShadow: '0 8px 24px rgba(124, 58, 237, 0.5)',
            }}
          >
            gem.studio →
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
