import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Life OS',
    short_name: 'Life OS',
    description: 'Dashboard personale',
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
  }
}
