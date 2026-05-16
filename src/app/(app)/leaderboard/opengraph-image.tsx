import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'GEM Industry Portal — Where the industry finds scripts'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const CREAM = '#FAF7F0'
const PURPLE = '#7C3AED'
const GOLD = '#C9A55A'
const DARK = '#1A1A1A'
const GREEN = '#10B981'

export default async function LeaderboardOpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '48px 60px 0',
          background: CREAM,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: DARK,
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 4,
            color: PURPLE,
            marginBottom: 14,
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
            color: GREEN,
            textTransform: 'uppercase',
            marginBottom: 10,
          }}
        >
          INDUSTRY PORTAL
        </div>
        <div
          style={{
            display: 'flex',
            fontFamily: 'Georgia, serif',
            fontSize: 44,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: -1.2,
            marginBottom: 8,
          }}
        >
          Where the industry finds scripts that fit.
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 17,
            color: '#555',
            lineHeight: 1.4,
            marginBottom: 26,
            maxWidth: 900,
          }}
        >
          Producers, agents, and dev execs scout for the screenwriters making moves right now.
        </div>

        {/* 3 sample script cards */}
        <div style={{ display: 'flex', gap: 16 }}>
          {[
            { title: 'Oldest Friend', body: 'A feral LA mom returns to her Missouri best friend’s wedding and turns a controlled weekend into a reckoning.', author: 'Jessilyn King' },
            { title: 'SWITCHED SKIN', body: 'A tattooed murder suspect and his smug defense lawyer swap bodies in a county jail, forcing them to outrun cartel muscle.', author: 'Mycah Roberts' },
            { title: 'The Union', body: 'A dutiful young man in a government-controlled pairing system experiences a genuine connection for the first time.', author: 'Jessilyn King' },
          ].map((card) => (
            <div
              key={card.title}
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                background: '#fff',
                border: '1px solid #F0E5C8',
                borderRadius: 12,
                padding: 18,
                boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  alignSelf: 'flex-start',
                  gap: 6,
                  background: '#ECFDF5',
                  color: GREEN,
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: 1.5,
                  padding: '5px 10px',
                  borderRadius: 6,
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 13,
                    height: 13,
                    borderRadius: 999,
                    background: GREEN,
                    color: '#fff',
                    fontSize: 9,
                  }}
                >
                  ✓
                </div>
                QUALIFIED
              </div>
              <div
                style={{
                  display: 'flex',
                  fontFamily: 'Georgia, serif',
                  fontSize: 18,
                  fontWeight: 700,
                  marginBottom: 8,
                  lineHeight: 1.2,
                }}
              >
                {card.title}
              </div>
              <div
                style={{
                  display: 'flex',
                  fontSize: 12,
                  lineHeight: 1.45,
                  color: '#555',
                  marginBottom: 10,
                }}
              >
                {card.body}
              </div>
              <div
                style={{
                  display: 'flex',
                  fontSize: 11,
                  color: '#888',
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
