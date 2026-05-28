import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'GEM — The Leaderboard'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const DEEP_PURPLE = '#2b1a55'
const PURPLE = '#7C3AED'
const LIGHT_PURPLE = '#a78bfa'

export default async function LeaderboardOpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '52px 60px 0',
          background: DEEP_PURPLE,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: '#ffffff',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: 4,
            color: LIGHT_PURPLE,
            marginBottom: 20,
          }}
        >
          GEM
        </div>
        <div
          style={{
            display: 'flex',
            fontFamily: 'Georgia, serif',
            fontSize: 48,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: -1.5,
            marginBottom: 12,
          }}
        >
          The Leaderboard
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 20,
            color: 'rgba(255,255,255,0.6)',
            lineHeight: 1.4,
            marginBottom: 36,
            maxWidth: 700,
          }}
        >
          The best unproduced screenplays in Hollywood, ranked.
        </div>

        {/* 3 sample script cards */}
        <div style={{ display: 'flex', gap: 16 }}>
          {[
            { rank: 1, title: 'Oldest Friend', genre: 'Drama', score: 84, author: 'Jessilyn King' },
            { rank: 2, title: 'SWITCHED SKIN', genre: 'Thriller', score: 81, author: 'Mycah Roberts' },
            { rank: 3, title: 'The Union', genre: 'Drama', score: 79, author: 'Jessilyn King' },
          ].map((card) => (
            <div
              key={card.title}
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                background: '#ffffff',
                borderRadius: 12,
                padding: 20,
                boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                position: 'relative',
              }}
            >
              {/* Rank badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'absolute',
                  top: -8,
                  left: -8,
                  width: 28,
                  height: 28,
                  borderRadius: 999,
                  background: card.rank === 1 ? PURPLE : card.rank === 2 ? '#8b5cf6' : LIGHT_PURPLE,
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 800,
                }}
              >
                {card.rank}
              </div>
              <div
                style={{
                  display: 'flex',
                  fontFamily: 'Georgia, serif',
                  fontSize: 19,
                  fontWeight: 700,
                  color: '#111827',
                  marginBottom: 6,
                  lineHeight: 1.2,
                }}
              >
                {card.title}
              </div>
              <div
                style={{
                  display: 'flex',
                  fontSize: 12,
                  color: '#6b7280',
                  fontWeight: 600,
                  marginBottom: 14,
                }}
              >
                {card.genre}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#6b7280',
                  }}
                >
                  GEM Score
                </div>
                <div
                  style={{
                    display: 'flex',
                    fontSize: 20,
                    fontWeight: 800,
                    color: PURPLE,
                  }}
                >
                  {card.score}
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  fontSize: 11,
                  color: '#9ca3af',
                  fontStyle: 'italic',
                }}
              >
                By {card.author}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  )
}
