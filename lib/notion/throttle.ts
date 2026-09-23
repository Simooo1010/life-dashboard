// Notion allows ~3 requests/second per integration and answers bursts with
// 429 + Retry-After. Every Notion-backed source (Life OS, Second Brain,
// Newsletter) shares one token, and a single page render or force sync fans
// out into dozens of calls — without pacing, whichever source loses the race
// fails and its cached copy silently stays stale.
//
// This wraps whole SDK requests rather than `fetch`: Next.js patches the
// global fetch (response teeing, data cache), which must not sit under the
// Notion client.

const MIN_INTERVAL_MS = 340
const MAX_RETRIES = 4
const MAX_RETRY_WAIT_MS = 20_000
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504])

let nextSlot = 0

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function waitForSlot(): Promise<void> {
  const now = Date.now()
  const slot = Math.max(now, nextSlot)
  nextSlot = slot + MIN_INTERVAL_MS
  if (slot > now) await sleep(slot - now)
}

interface HttpError {
  status: number
  headers?: { get(name: string): string | null }
}

function asHttpError(error: unknown): HttpError | null {
  if (!error || typeof error !== 'object' || typeof (error as HttpError).status !== 'number') return null
  return error as HttpError
}

function retryDelayMs(error: HttpError, attempt: number): number {
  const header = Number(error.headers?.get('retry-after'))
  if (Number.isFinite(header) && header > 0) return header * 1000
  return Math.min(1000 * 2 ** attempt, 8000)
}

export async function withNotionThrottle<T>(request: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    await waitForSlot()
    try {
      return await request()
    } catch (error) {
      const http = asHttpError(error)
      if (!http || !RETRYABLE_STATUS.has(http.status) || attempt >= MAX_RETRIES) throw error
      const delay = retryDelayMs(http, attempt)
      if (delay > MAX_RETRY_WAIT_MS) throw error
      // Hold back every queued Notion call, not just this one: the limit is
      // per integration, so the others would only earn more 429s.
      nextSlot = Math.max(nextSlot, Date.now() + delay)
      console.warn(`[Notion] HTTP ${http.status}, retrying in ${Math.round(delay / 1000)}s (attempt ${attempt + 1}/${MAX_RETRIES})`)
    }
  }
}

export function resetNotionThrottleForTests(): void {
  nextSlot = 0
}
