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
          padding: '40px 48px 0',
          background: DEEP_PURPLE,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: '#ffffff',
        }}
      >
        {/* GEM logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div
            style={{
              display: 'flex',
              width: 24,
              height: 24,
              transform: 'rotate(45deg)',
              background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
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
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: -1.5,
            marginBottom: 8,
            color: GOLD,
          }}
        >
          The Leaderboard
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 24,
            color: '#ffffff',
            lineHeight: 1.4,
            marginBottom: 28,
          }}
        >
          The best unproduced screenplays in Hollywood, ranked.
        </div>

        {/* Single featured card */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            background: '#ffffff',
            borderRadius: 16,
            padding: '24px 28px',
            maxWidth: 540,
            boxShadow: '0 6px 24px rgba(0,0,0,0.25)',
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
              top: -12,
              left: -12,
              width: 44,
              height: 44,
              borderRadius: 999,
              background: PURPLE,
              color: '#fff',
              fontSize: 18,
              fontWeight: 800,
            }}
          >
            #1
          </div>

          {/* Author */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 30,
                height: 30,
                borderRadius: 999,
                background: '#8b5cf6',
                color: '#fff',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              JE
            </div>
            <div style={{ display: 'flex', fontSize: 14, color: '#9ca3af' }}>Jordan Ellis</div>
          </div>

          {/* Title + genre */}
          <div
            style={{
              display: 'flex',
              fontFamily: 'Georgia, serif',
              fontSize: 30,
              fontWeight: 700,
              color: '#111827',
              marginBottom: 4,
              lineHeight: 1.2,
            }}
          >
            Oldest Friend
          </div>
          <div style={{ display: 'flex', fontSize: 15, color: '#9ca3af', fontWeight: 600, marginBottom: 16 }}>
            Feature · Drama
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', height: 1, background: '#f3f4f6', marginBottom: 16 }} />

          {/* Score + Heat */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', fontSize: 14, fontWeight: 600, color: '#6b7280' }}>GEM Score</div>
              <div style={{ display: 'flex', fontSize: 30, fontWeight: 800, color: PURPLE }}>84</div>
              <div
                style={{
                  display: 'flex',
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 999,
                  background: '#f3f0ff',
                  color: PURPLE,
                }}
              >
                #1
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', fontSize: 14, fontWeight: 600, color: '#6b7280' }}>Project Heat</div>
              <div style={{ display: 'flex', fontSize: 30, fontWeight: 800, color: '#f97316' }}>12</div>
              <div
                style={{
                  display: 'flex',
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '3px 10px',
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
