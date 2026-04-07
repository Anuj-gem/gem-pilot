import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

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
          background: '#0a0a0a',
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
            transform: 'rotate(45deg)',
            display: 'flex',
            boxShadow: '0 0 8px rgba(167, 139, 250, 0.6)',
          }}
        />
      </div>
    ),
    { ...size }
  )
}
