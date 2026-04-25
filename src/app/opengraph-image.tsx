import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'GEM — Built to help screenwriters succeed'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const CREAM = '#FAF7F0'
const PURPLE = '#7C3AED'
const GOLD = '#C9A55A'
const DARK = '#1A1A1A'
const GREEN = '#10B981'

export default async function OpengraphImage() {
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
        {/* Left — wordmark, label, headline, sub, CTA */}
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
              marginBottom: 20,
            }}
          >
            A pitch you can send. Notes only you see.{'\n'}An industry match for your script.
          </div>
          <div
            style={{
              display: 'flex',
              alignSelf: 'flex-start',
              padding: '14px 26px',
              borderRadius: 10,
              background: PURPLE,
              color: '#fff',
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            First read free →
          </div>
        </div>

        {/* Right — demo card */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: 480,
            background: '#fff',
            borderRadius: 14,
            padding: 24,
            boxShadow: '0 12px 32px rgba(0,0,0,0.06)',
          }}
        >
          {/* Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              alignSelf: 'flex-start',
              gap: 8,
              background: '#ECFDF5',
              color: GREEN,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 1.5,
              padding: '6px 12px',
              borderRadius: 999,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 16,
                height: 16,
                borderRadius: 999,
                background: GREEN,
                color: '#fff',
                fontSize: 10,
              }}
            >
              ✓
            </div>
            QUALIFIES FOR INDUSTRY MATCHING
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 1.5,
              color: GOLD,
              marginBottom: 8,
            }}
          >
            HEADLINE
          </div>
          <div
            style={{
              display: 'flex',
              background: '#FFFBF0',
              border: `1px solid #F0E5C8`,
              borderRadius: 8,
              padding: 14,
              fontFamily: 'Georgia, serif',
              fontSize: 14,
              lineHeight: 1.4,
              fontWeight: 600,
              color: DARK,
            }}
          >
            A New Jersey mob boss in therapy races to hide panic attacks before family, crew, and rivals expose him.
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
