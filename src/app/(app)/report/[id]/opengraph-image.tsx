import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const alt = 'GEM Read'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const CREAM = '#FAF7F0'
const PURPLE = '#7C3AED'
const GOLD = '#C9A55A'
const DARK = '#1A1A1A'
const GREEN = '#10B981'

// Same qualification floor as report-privacy.ts. Inlined here so this edge
// runtime file doesn't import the (server-only) privacy lib.
const QUALIFICATION_THRESHOLD = 50

type ReportData = {
  title: string
  author: string | null
  headline: string | null
  qualifies: boolean
  unlocked: boolean
}

// Service-role key bypasses RLS — safe here because this runs server-side
// in the edge runtime and the key is never sent to the client.
async function getReportData(id: string): Promise<ReportData> {
  // Fallback: locked. Underleak is safer than overleak — never leak a
  // private writer's title or headline through link previews.
  const fallback: ReportData = {
    title: 'Screenplay',
    author: null,
    headline: null,
    qualifies: false,
    unlocked: false,
  }
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { data: evalRow } = await supabase
      .from('script_evaluations')
      .select('weighted_score, evaluation, edited_fields, submission_id')
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
    const qualifies = score !== null && score >= QUALIFICATION_THRESHOLD

    // Headline: prefer edited override, fall back to evaluation positioning_hook.
    const evaluation = (evalRow as any).evaluation as Record<string, unknown> | null
    const edited = (evalRow as any).edited_fields as Record<string, unknown> | null
    const editedHeadline = (edited?.logline as string | null) ?? null
    const generatedHeadline = (evaluation?.positioning_hook as string | null) ?? null
    const headline = (editedHeadline && editedHeadline.trim().length > 0
      ? editedHeadline
      : generatedHeadline) ?? null

    const { data: subRow } = await supabase
      .from('script_submissions')
      .select('title, user_id, is_public')
      .eq('id', submissionId)
      .single()

    const title = ((subRow as any)?.title as string) ?? fallback.title
    const userId = ((subRow as any)?.user_id as string | null) ?? null
    const isPublic = Boolean((subRow as any)?.is_public)

    let author: string | null = null
    let ownerIsSubscribed = false
    if (userId) {
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('full_name, subscription_status')
        .eq('id', userId)
        .single()
      const fullName = ((profileRow as any)?.full_name as string | null) ?? null
      if (fullName && fullName.trim().length > 0) {
        author = fullName.trim()
      }
      ownerIsSubscribed =
        ((profileRow as any)?.subscription_status as string | null) === 'active'
    }

    // Same gate as the page: unlocked = owner subscribed OR post is public.
    const unlocked = ownerIsSubscribed || isPublic

    return { title, author, headline, qualifies, unlocked }
  } catch {
    return fallback
  }
}

export default async function ReportOpengraphImage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string }
}) {
  const resolved = await Promise.resolve(params as any)
  const id = (resolved?.id as string) ?? ''
  const { title, author, headline, qualifies, unlocked } = await getReportData(id)

  // LOCKED path: render the GENERIC GEM brand image — never leak title,
  // author, or headline. The fallback is the same hero we use site-wide.
  if (!unlocked) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            padding: '0 60px',
            gap: 40,
            background: CREAM,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            color: DARK,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div
              style={{
                display: 'flex',
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: 4,
                color: PURPLE,
                marginBottom: 20,
              }}
            >
              GEM
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: 2.5,
                color: GOLD,
                textTransform: 'uppercase',
                marginBottom: 14,
              }}
            >
              For Screenwriters
            </div>
            <div
              style={{
                display: 'flex',
                fontFamily: 'Georgia, serif',
                fontSize: 62,
                fontWeight: 700,
                lineHeight: 1,
                letterSpacing: -1.5,
                marginBottom: 20,
              }}
            >
              Built to help{'\n'}writers succeed.
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 18,
                lineHeight: 1.5,
                color: '#444',
              }}
            >
              A pitch you can send. Notes only you see.{'\n'}An industry match for your script.
            </div>
          </div>
        </div>
      ),
      { ...size }
    )
  }

  // Adaptive title sizing — long titles get smaller font.
  const MAX_TITLE_LEN = 70
  const displayTitle = title.length > MAX_TITLE_LEN ? title.slice(0, MAX_TITLE_LEN - 1) + '…' : title
  const titleLen = displayTitle.length
  const titleFontSize = titleLen > 50 ? 48 : titleLen > 30 ? 56 : 64

  // Truncate headline if it's huge (rare but possible).
  const MAX_HEADLINE_LEN = 220
  const displayHeadline = headline && headline.length > MAX_HEADLINE_LEN
    ? headline.slice(0, MAX_HEADLINE_LEN - 1) + '…'
    : headline

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: 60,
          background: CREAM,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: DARK,
        }}
      >
        {/* Top: brand + eyebrow */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 4,
              color: PURPLE,
              marginBottom: 24,
            }}
          >
            GEM
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 2.5,
              color: GOLD,
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            A GEM Read
          </div>
          <div
            style={{
              display: 'flex',
              fontFamily: 'Georgia, serif',
              fontSize: titleFontSize,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -1.5,
              marginBottom: 8,
            }}
          >
            {displayTitle}
          </div>
          {author && (
            <div
              style={{
                display: 'flex',
                fontSize: 18,
                color: '#666',
                fontStyle: 'italic',
                marginBottom: 28,
              }}
            >
              by {author}
            </div>
          )}
          {displayHeadline && (
            <div
              style={{
                display: 'flex',
                background: '#fff',
                border: `1px solid #F0E5C8`,
                borderRadius: 12,
                padding: 22,
                fontFamily: 'Georgia, serif',
                fontSize: 20,
                lineHeight: 1.4,
                fontWeight: 600,
                color: DARK,
                boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
              }}
            >
              {displayHeadline}
            </div>
          )}
        </div>

        {/* Bottom: matching badge + wordmark */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginTop: 'auto',
          }}
        >
          {qualifies && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: '#ECFDF5',
                color: GREEN,
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: 1.5,
                padding: '9px 16px',
                borderRadius: 999,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 18,
                  height: 18,
                  borderRadius: 999,
                  background: GREEN,
                  color: '#fff',
                  fontSize: 11,
                }}
              >
                ✓
              </div>
              QUALIFIES FOR INDUSTRY MATCHING
            </div>
          )}
          <div
            style={{
              display: 'flex',
              fontSize: 14,
              color: '#666',
              fontStyle: 'italic',
            }}
          >
            gem.studio
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
