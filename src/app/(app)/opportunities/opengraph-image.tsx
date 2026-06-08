import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'GEM — Open opportunity for screenwriters'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          background: '#0f0b1a',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '80px 100px',
          position: 'relative',
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 48,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              transform: 'rotate(45deg)',
              background: '#7c3aed',
              display: 'flex',
            }}
          />
          <div
            style={{
              fontSize: 42,
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: -1,
              display: 'flex',
            }}
          >
            GEM
          </div>
        </div>

        {/* Main text */}
        <div
          style={{
            display: 'flex',
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: 3,
            textTransform: 'uppercase',
            color: '#a78bfa',
            marginBottom: 16,
          }}
        >
          Open opportunity
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 56,
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.15,
            letterSpacing: -1.5,
            marginBottom: 24,
          }}
        >
          Open opportunity for screenwriters
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 22,
            color: 'rgba(255,255,255,0.55)',
            fontWeight: 500,
          }}
        >
          Apply for free on GEM
        </div>

        {/* Domain */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            right: 60,
            fontSize: 15,
            color: 'rgba(255,255,255,0.3)',
            fontWeight: 500,
            display: 'flex',
          }}
        >
          gem.studio
        </div>
      </div>
    ),
    { ...size }
  )
}
