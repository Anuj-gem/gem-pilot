import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'GEM — The Leaderboard'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const DEEP_PURPLE = '#2b1a55'
const PURPLE = '#7C3AED'
const GOLD = '#f0c040'

export default async function LeaderboardOpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '36px 52px 40px',
          background: DEEP_PURPLE,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: '#ffffff',
        }}
      >
        {/* GEM logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div
            style={{
              display: 'flex',
              width: 24,
              height: 24,
              transform: 'rotate(45deg)',
              background: '#7c3aed',
              borderRadius: 3,
            }}
          />
          <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, letterSpacing: 1 }}>
            GEM
          </div>
        </div>

        {/* Title in gold */}
        <div
          style={{
            display: 'flex',
            fontFamily: 'Georgia, serif',
            fontSize: 72,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: -2,
            marginBottom: 6,
            color: GOLD,
          }}
        >
          The Leaderboard
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 26,
            fontWeight: 700,
            color: '#ffffff',
            lineHeight: 1.3,
            marginBottom: 24,
          }}
        >
          The best unproduced screenplays in Hollywood, ranked.
        </div>

        {/* Card — full width, fixed height to fill remaining space, content centered */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            background: '#ffffff',
            borderRadius: 18,
            padding: '28px 40px',
            height: 370,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            position: 'relative',
          }}
        >
          {/* #1 badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'absolute',
              top: -14,
              left: -14,
              width: 48,
              height: 48,
              borderRadius: 999,
              background: PURPLE,
              color: '#fff',
              fontSize: 20,
              fontWeight: 800,
            }}
          >
            #1
          </div>

          {/* Author */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: 999,
                background: '#8b5cf6',
                color: '#fff',
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              JE
            </div>
            <div style={{ display: 'flex', fontSize: 16, fontWeight: 700, color: '#111827' }}>Jordan Ellis</div>
          </div>

          {/* Title + genre */}
          <div
            style={{
              display: 'flex',
              fontFamily: 'Georgia, serif',
              fontSize: 36,
              fontWeight: 700,
              color: '#111827',
              marginBottom: 6,
              lineHeight: 1.2,
            }}
          >
            Oldest Friend
          </div>
          <div style={{ display: 'flex', fontSize: 18, color: '#111827', fontWeight: 700, marginBottom: 20 }}>
            Feature · Drama
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', height: 1, background: '#e5e7eb', marginBottom: 20 }} />

          {/* Score + Heat */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', fontSize: 16, fontWeight: 700, color: '#111827' }}>GEM Score</div>
              <div style={{ display: 'flex', fontSize: 36, fontWeight: 800, color: PURPLE }}>84</div>
              <div
                style={{
                  display: 'flex',
                  fontSize: 14,
                  fontWeight: 700,
                  padding: '4px 12px',
                  borderRadius: 999,
                  background: '#f3f0ff',
                  color: PURPLE,
                }}
              >
                #1
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', fontSize: 16, fontWeight: 700, color: '#111827' }}>Project Heat</div>
              <div style={{ display: 'flex', fontSize: 36, fontWeight: 800, color: '#f97316' }}>12</div>
              <div
                style={{
                  display: 'flex',
                  fontSize: 14,
                  fontWeight: 700,
                  padding: '4px 12px',
                  borderRadius: 999,
                  background: '#fff7ed',
                  color: '#f97316',
                }}
              >
                #1
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
