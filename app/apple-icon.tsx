import { ImageResponse } from 'next/og'

export const size = {
  width: 180,
  height: 180,
}

export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'center',
          background: '#18171a',
          color: '#f0ede8',
          display: 'flex',
          height: '100%',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        <div
          style={{
            alignItems: 'center',
            background: '#3a2314',
            borderRadius: 40,
            display: 'flex',
            height: 112,
            justifyContent: 'center',
            width: 112,
          }}
        >
          <div
            style={{
              alignItems: 'center',
              background: '#f0ede8',
              clipPath: 'polygon(25% 6.7%, 75% 6.7%, 100% 50%, 75% 93.3%, 25% 93.3%, 0 50%)',
              display: 'flex',
              height: 56,
              justifyContent: 'center',
              width: 64,
            }}
          >
            <div
              style={{
                background: '#3a2314',
                clipPath: 'polygon(25% 6.7%, 75% 6.7%, 100% 50%, 75% 93.3%, 25% 93.3%, 0 50%)',
                height: 46,
                width: 54,
              }}
            />
          </div>
        </div>
      </div>
    ),
    size,
  )
}
