import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
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
          borderRadius: 36,
        }}
      >
        <div
          style={{
            width: 96,
            height: 96,
            background: '#7c3aed',
            transform: 'rotate(45deg)',
            display: 'flex',
            boxShadow: '0 0 40px rgba(167, 139, 250, 0.6)',
          }}
        />
      </div>
    ),
    { ...size }
  )
}
