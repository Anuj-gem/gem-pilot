import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

// Crisp purple diamond favicon. Transparent background so it shows
// cleanly on both light and dark browser tab themes. The dark wrapper
// the previous version used made the icon look "blank" against most
// browser chrome. Anuj 2026-04-28.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
            transform: 'rotate(45deg)',
            borderRadius: 3,
            display: 'flex',
          }}
        />
      </div>
    ),
    { ...size }
  )
}
