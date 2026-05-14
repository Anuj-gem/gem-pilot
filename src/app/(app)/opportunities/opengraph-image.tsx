import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Opportunities — GEM'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const CREAM = '#FAF7F0'
const PURPLE = '#7C3AED'
const GOLD = '#C9A55A'
const DARK = '#1A1A1A'

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: CREAM,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: DARK,
          padding: '60px 80px',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 14,
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
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: 2.5,
            color: GOLD,
            textTransform: 'uppercase',
            marginBottom: 20,
          }}
        >
          Opportunities
        </div>
        <div
          style={{
            display: 'flex',
            fontFamily: 'Georgia, serif',
            fontSize: 56,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: -1,
            textAlign: 'center',
            marginBottom: 24,
          }}
        >
          Scripts wanted.
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 22,
            lineHeight: 1.5,
            color: '#555',
            textAlign: 'center',
          }}
        >
          Opportunities from producers and lit reps looking for new voices.
        </div>
      </div>
    ),
    { ...size }
  )
}
