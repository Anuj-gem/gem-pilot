import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Upload your screenplay — Free read in 60 seconds'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const CREAM = '#FAF7F0'
const PURPLE = '#7C3AED'
const GOLD = '#C9A55A'
const DARK = '#1A1A1A'

export default async function SubmitOpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          padding: '0 60px',
          gap: 48,
          background: CREAM,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: DARK,
        }}
      >
        {/* Left — copy + 1-2-3 */}
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
              fontSize: 60,
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: -1.5,
              marginBottom: 22,
            }}
          >
            Upload your{'\n'}screenplay.
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 19,
              lineHeight: 1.5,
              color: '#444',
              marginBottom: 28,
            }}
          >
            Get a free read in 60 seconds.
          </div>
          {/* Steps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              ['1.', 'Drop your PDF'],
              ['2.', 'Get pitch + private notes'],
              ['3.', 'Match with industry partners'],
            ].map(([num, label]) => (
              <div
                key={num}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  fontSize: 16,
                  color: '#333',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    minWidth: 24,
                    fontFamily: 'Georgia, serif',
                    fontSize: 18,
                    fontWeight: 700,
                    color: GOLD,
                  }}
                >
                  {num}
                </div>
                <div style={{ display: 'flex' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — drop zone graphic */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: 440,
            background: '#fff',
            border: `3px dashed ${GOLD}`,
            borderRadius: 18,
            padding: '48px 32px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 72,
              height: 72,
              borderRadius: 999,
              background: '#FFFBF0',
              fontSize: 36,
              color: GOLD,
              marginBottom: 18,
            }}
          >
            ↑
          </div>
          <div
            style={{
              display: 'flex',
              fontFamily: 'Georgia, serif',
              fontSize: 22,
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            Drop your PDF here
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 14,
              color: '#666',
              marginBottom: 22,
            }}
          >
            First read free · No credit card
          </div>
          <div
            style={{
              display: 'flex',
              padding: '14px 24px',
              borderRadius: 10,
              background: PURPLE,
              color: '#fff',
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            Get Started — Free
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
