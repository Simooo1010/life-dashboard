import { sealData } from 'iron-session'
import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

const SESSION_PASSWORD = 'test-session-password-that-is-at-least-32-characters-long'

async function loadMiddleware() {
  vi.resetModules()
  vi.stubEnv('SESSION_PASSWORD', SESSION_PASSWORD)
  return import('./middleware')
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('authentication middleware', () => {
  it.each(['/manifest.webmanifest', '/icon', '/apple-icon'])(
    'allows the public installed-app resource %s without a session',
    async pathname => {
      const { middleware } = await loadMiddleware()
      const response = await middleware(new NextRequest(`https://dashboard.example${pathname}`))

      expect(response.status).toBe(200)
      expect(response.headers.get('location')).toBeNull()
    },
  )

  it('redirects an authenticated visit to /login back into the dashboard', async () => {
    const session = await sealData(
      { authenticated: true, authenticatedAt: '2026-09-23T12:00:00.000Z' },
      { password: SESSION_PASSWORD, ttl: 60 * 60 * 24 * 30 },
    )
    const { middleware } = await loadMiddleware()
    const request = new NextRequest('https://dashboard.example/login', {
      headers: {
        cookie: `life_dashboard_session=${session}`,
      },
    })

    const response = await middleware(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://dashboard.example/')
  })
})
