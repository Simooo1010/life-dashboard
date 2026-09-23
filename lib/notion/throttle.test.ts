import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { APIResponseError } from '@notionhq/client'
import { resetNotionThrottleForTests, withNotionThrottle } from './throttle'

function notionError(status: number, retryAfter?: string): APIResponseError {
  return new APIResponseError({
    code: status === 429 ? 'rate_limited' : 'internal_server_error',
    status,
    message: 'error',
    headers: new Headers(retryAfter ? { 'retry-after': retryAfter } : {}),
    rawBodyText: '{}',
  } as ConstructorParameters<typeof APIResponseError>[0])
}

describe('withNotionThrottle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    resetNotionThrottleForTests()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('spaces out concurrent requests instead of bursting them', async () => {
    const starts: number[] = []
    const request = vi.fn(async () => { starts.push(Date.now()); return 'ok' })

    const all = Promise.all([withNotionThrottle(request), withNotionThrottle(request), withNotionThrottle(request)])
    await vi.runAllTimersAsync()
    await all

    expect(request).toHaveBeenCalledTimes(3)
    expect(starts[1] - starts[0]).toBeGreaterThanOrEqual(340)
    expect(starts[2] - starts[1]).toBeGreaterThanOrEqual(340)
  })

  it('retries a 429 after the Retry-After delay and returns the eventual result', async () => {
    const request = vi.fn()
      .mockRejectedValueOnce(notionError(429, '2'))
      .mockResolvedValueOnce('fresh')

    const pending = withNotionThrottle(request)
    await vi.advanceTimersByTimeAsync(1_000)
    expect(request).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1_500)

    await expect(pending).resolves.toBe('fresh')
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('gives up immediately when Notion asks to wait longer than a request can afford', async () => {
    const request = vi.fn().mockRejectedValue(notionError(429, '60'))

    await expect(withNotionThrottle(request)).rejects.toMatchObject({ status: 429 })
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('does not retry client errors', async () => {
    const request = vi.fn().mockRejectedValue(notionError(404))

    await expect(withNotionThrottle(request)).rejects.toMatchObject({ status: 404 })
    expect(request).toHaveBeenCalledTimes(1)
  })
})
