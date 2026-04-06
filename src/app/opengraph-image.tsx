import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'GEM — Get Read By A Selznick'
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
          justifyContent: 'space-between',
          padding: '80px',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0b2e 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: '#ffffff',
        }}
      >
        {/* Top — wordmark */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: 36,
            fontWeight: 800,
            letterSpacing: 4,
            color: '#ffffff',
          }}
        >
          GEM
        </div>

        {/* Middle — tagline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div
            style={{
              fontSize: 84,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2,
              color: '#ffffff',
              maxWidth: 1000,
            }}
          >
            Get the read a producer would give your script.
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 400,
              color: '#a78bfa',
              maxWidth: 900,
              lineHeight: 1.3,
            }}
          >
            Upload. Score. Improve. In under a minute.
          </div>
        </div>

        {/* Bottom — URL */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 24,
            color: '#9ca3af',
          }}
        >
          <div style={{ display: 'flex' }}>gem.studio</div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 24px',
              borderRadius: 999,
              background: '#7c3aed',
              color: '#ffffff',
              fontSize: 22,
              fontWeight: 600,
            }}
          >
            Producer-Grade Screenplay Evaluation
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
