import { describe, expect, it } from 'vitest'
import manifest from './manifest'

describe('installed web app manifest', () => {
  it('keeps every dashboard route inside the standalone application', () => {
    expect(manifest()).toMatchObject({
      id: '/',
      name: 'Life OS',
      short_name: 'Life OS',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: '#18171a',
      theme_color: '#18171a',
      icons: [
        {
          src: '/icon',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
        },
      ],
    })
  })
})
