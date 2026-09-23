import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const THIRTY_DAYS_IN_SECONDS = 60 * 60 * 24 * 30
const SESSION_PASSWORD = 'test-session-password-that-is-at-least-32-characters-long'

interface StoredCookie {
  name: string
  value: string
  options: {
    maxAge?: number
    path?: string
  }
}

describe('persistent authentication session', () => {
  let storedCookie: StoredCookie | undefined

  beforeEach(() => {
    vi.resetModules()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-23T12:00:00.000Z'))
    vi.stubEnv('SESSION_PASSWORD', SESSION_PASSWORD)
    vi.stubEnv('NODE_ENV', 'production')

    const cookieStore = {
      get(name: string) {
        if (!storedCookie || storedCookie.name !== name) return undefined
        return { name: storedCookie.name, value: storedCookie.value }
      },
      set(name: string, value: string, options: StoredCookie['options']) {
        storedCookie = { name, value, options }
      },
    }

    vi.doMock('next/headers', () => ({
      cookies: async () => cookieStore,
    }))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
    vi.doUnmock('next/headers')
  })

  it('keeps a saved login valid after the library default fourteen-day TTL', async () => {
    const { isAuthenticated, login } = await import('./session')

    await login()

    expect(storedCookie?.options.path).toBe('/')
    expect(storedCookie?.options.maxAge).toBe(THIRTY_DAYS_IN_SECONDS)

    vi.setSystemTime(new Date('2026-10-08T12:00:00.000Z'))

    expect(await isAuthenticated()).toBe(true)
  })
})
