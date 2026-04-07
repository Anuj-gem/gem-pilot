import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const alt = 'GEM Script Evaluation'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

type ReportData = {
  title: string
  author: string | null
  score: number | null
  tier: string | null
}

// Service-role key bypasses RLS — safe here because this runs server-side
// in the edge runtime and the key is never sent to the client.
async function getReportData(id: string): Promise<ReportData> {
  const fallback: ReportData = {
    title: 'Screenplay',
    author: null,
    score: null,
    tier: null,
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
      .select('title, user_id')
      .eq('id', submissionId)
      .single()

    const title = ((subRow as any)?.title as string) ?? fallback.title
    const userId = ((subRow as any)?.user_id as string | null) ?? null

    // Fetch author display name from profiles (nullable — anonymous submissions)
    let author: string | null = null
    if (userId) {
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single()
      const fullName = ((profileRow as any)?.full_name as string | null) ?? null
      if (fullName && fullName.trim().length > 0) {
        author = fullName.trim()
      }
    }

    return { title, author, score, tier }
  } catch {
    return fallback
  }
}

// Display label overrides — DB values stay stable, UI copy evolves here.
function tierLabel(tier: string | null): string {
  if (tier === 'Optionable') return 'Option Ready'
  if (tier === 'Needs Development') return 'Shows Promise'
  if (tier === 'Greenlight Material') return 'Greenlight Material'
  return tier ?? ''
}

// Tier gradient (c1 -> c2) and shadow rgb
function tierGradient(tier: string | null): { c1: string; c2: string; rgb: string } {
  if (tier === 'Greenlight Material') return { c1: '#16a34a', c2: '#15803d', rgb: '22, 163, 74' }
  if (tier === 'Needs Development') return { c1: '#f59e0b', c2: '#d97706', rgb: '245, 158, 11' }
  // Optionable / default
  return { c1: '#3b82f6', c2: '#2563eb', rgb: '59, 130, 246' }
}

// Grab the first name for the CTA — falls back gracefully
function firstName(full: string | null): string | null {
  if (!full) return null
  const first = full.trim().split(/\s+/)[0]
  return first || null
}

export default async function ReportOpengraphImage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string }
}) {
  const resolved = await Promise.resolve(params as any)
  const id = (resolved?.id as string) ?? ''
  const { title, author, score, tier } = await getReportData(id)

  const scoreDisplay = score !== null ? Math.round(score).toString() : '—'
  const tierText = tierLabel(tier)
  const grad = tierGradient(tier)

  const authorFirst = firstName(author)
  const possessive = authorFirst
    ? `${authorFirst}${authorFirst.endsWith('s') ? "'" : "'s"}`
    : null
  const ctaText = possessive
    ? `Read the review for ${possessive} screenplay`
    : 'Read the full review'

  // Adaptive title sizing for very long titles
  const titleLen = title.length
  const titleFontSize = titleLen > 60 ? 52 : titleLen > 40 ? 62 : titleLen > 24 ? 72 : 80

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
            'radial-gradient(ellipse at top right, rgba(124, 58, 237, 0.28) 0%, transparent 55%), radial-gradient(ellipse at bottom left, rgba(59, 130, 246, 0.15) 0%, transparent 55%), linear-gradient(135deg, #0a0a0a 0%, #1a0b2e 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: '#ffffff',
          position: 'relative',
        }}
      >
        {/* Top bar — wordmark left, eyebrow right */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            {/* Diamond mark */}
            <div
              style={{
                width: 18,
                height: 18,
                background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
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
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: 4,
              textTransform: 'uppercase',
              color: '#a78bfa',
              padding: '10px 20px',
              border: '1.5px solid rgba(167, 139, 250, 0.4)',
              borderRadius: 999,
              background: 'rgba(124, 58, 237, 0.12)',
            }}
          >
            Script Evaluation
          </div>
        </div>

        {/* Hero — title, byline, score + tier */}
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
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              maxWidth: 1000,
            }}
          >
            &ldquo;{title}&rdquo;
          </div>
          {author && (
            <div
              style={{
                fontSize: 28,
                fontWeight: 400,
                color: '#9ca3af',
                fontStyle: 'italic',
                marginBottom: 40,
                display: 'flex',
              }}
            >
              by {author}
            </div>
          )}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 28,
              marginTop: author ? 0 : 24,
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

        {/* Footer — CTA */}
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
              fontSize: 24,
              fontWeight: 600,
              color: '#e5e7eb',
              display: 'flex',
            }}
          >
            {ctaText}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 22px',
              borderRadius: 999,
              background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
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
