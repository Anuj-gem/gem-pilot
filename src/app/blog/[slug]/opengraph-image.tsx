import { ImageResponse } from 'next/og'
import { getPost } from '@/lib/blog'

export const runtime = 'edge'
export const alt = 'GEM Blog'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const CREAM = '#FAF7F0'
const PURPLE = '#7C3AED'
const GOLD = '#C9A55A'
const DARK = '#1A1A1A'

export default async function BlogOpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string }
}) {
  const resolved = await Promise.resolve(params as any)
  const slug = (resolved?.slug as string) ?? ''
  const post = await getPost(slug)

  const title = post?.title ?? 'GEM Blog'
  const summary = post?.summary ?? ''

  // Adaptive title sizing — long titles get smaller font.
  const MAX_TITLE_LEN = 80
  const displayTitle =
    title.length > MAX_TITLE_LEN ? title.slice(0, MAX_TITLE_LEN - 1) + '…' : title
  const titleLen = displayTitle.length
  const titleFontSize = titleLen > 60 ? 46 : titleLen > 40 ? 54 : 62

  const MAX_SUMMARY_LEN = 160
  const displaySummary =
    summary.length > MAX_SUMMARY_LEN ? summary.slice(0, MAX_SUMMARY_LEN - 1) + '…' : summary

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
              alignItems: 'center',
              gap: 10,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                background: PURPLE,
                transform: 'rotate(45deg)',
                display: 'flex',
              }}
            />
            <div
              style={{
                display: 'flex',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 4,
                color: PURPLE,
              }}
            >
              GEM
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 2.5,
              color: GOLD,
              textTransform: 'uppercase',
              marginBottom: 16,
            }}
          >
            From the GEM Blog
          </div>
          <div
            style={{
              display: 'flex',
              fontFamily: 'Georgia, serif',
              fontSize: titleFontSize,
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: -1.5,
              marginBottom: displaySummary ? 20 : 0,
              maxWidth: 1000,
            }}
          >
            {displayTitle}
          </div>
          {displaySummary && (
            <div
              style={{
                display: 'flex',
                fontSize: 20,
                lineHeight: 1.5,
                color: '#555',
                maxWidth: 880,
              }}
            >
              {displaySummary}
            </div>
          )}
        </div>

        {/* Bottom: domain */}
        <div
          style={{
            display: 'flex',
            fontSize: 14,
            color: '#666',
            fontStyle: 'italic',
            marginTop: 'auto',
          }}
        >
          gem.studio
        </div>
      </div>
    ),
    { ...size }
  )
}
