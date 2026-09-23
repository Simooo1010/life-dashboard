import { NextRequest, after } from 'next/server'
import { runDailyOrchestrator } from '@/lib/orchestrator/daily-sync'
import { fetchNewsletterProjectState } from '@/lib/notion/newsletter'
import { fetchFinanceSnapshot } from '@/lib/finance/snapshot'
import { invalidateDashboardCache, type DashboardCacheSource } from '@/lib/cache/tags'
import { recordSyncRun, type SyncSource, type SyncTrigger } from '@/lib/sync/log'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type ProgressEvent =
  | { source: SyncSource; status: 'done' | 'error'; error?: string }
  | { done: true; error?: string; meta?: { fromCache: boolean; cacheAge?: number; generatedAt: string } }

const CACHE_SOURCE: Partial<Record<SyncSource, DashboardCacheSource>> = {
  'calendar': 'calendar',
  'life-os': 'lifeOs',
  'second-brain': 'secondBrain',
  'weather': 'weather',
  'newsletter': 'newsletter',
  'finance': 'finance',
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export async function GET(request: NextRequest) {
  const forceRefresh = request.nextUrl.searchParams.get('force') === '1'
  const trigger: SyncTrigger = forceRefresh ? 'manual' : 'auto'

  const encoder = new TextEncoder()
  const refreshed = new Set<DashboardCacheSource>()

  // Next.js applies revalidateTag() from a route handler only when it is
  // called before the handler returns, or inside after(). This handler returns
  // its streaming Response immediately, so invalidating from inside the stream
  // was silently dropped and pages kept serving their pre-sync caches. after()
  // runs once the stream has closed, when every source has reported.
  after(() => {
    for (const source of refreshed) invalidateDashboardCache(source)
    invalidateDashboardCache()
  })

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false
      const send = (event: ProgressEvent) => {
        if (closed) return
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }
      const progress = (source: SyncSource, status: 'done' | 'error', error?: string) => {
        const cacheSource = CACHE_SOURCE[source]
        if (status === 'done' && cacheSource) refreshed.add(cacheSource)
        send({ source, status, ...(error ? { error } : {}) })
      }

      try {
        const [result] = await Promise.all([
          runDailyOrchestrator(forceRefresh, { trigger, onProgress: progress }),
          recordSyncRun('newsletter', trigger, () => fetchNewsletterProjectState({ forceRefresh }))
            .then(() => progress('newsletter', 'done'))
            .catch(error => progress('newsletter', 'error', errorMessage(error))),
          recordSyncRun('finance', trigger, () => fetchFinanceSnapshot(true))
            .then(() => progress('finance', 'done'))
            .catch(error => progress('finance', 'error', errorMessage(error))),
        ])

        send({
          done: true,
          meta: {
            fromCache: result.fromCache,
            cacheAge: result.cacheAge,
            generatedAt: result.synthesis.generatedAt,
          },
        })
      } catch (error) {
        console.error('[api/sync/all]', error)
        send({ done: true, error: errorMessage(error) })
      } finally {
        closed = true
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
