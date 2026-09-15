import { NextRequest } from 'next/server'
import { runDailyOrchestrator } from '@/lib/orchestrator/daily-sync'
import { fetchNewsletterProjectState } from '@/lib/notion/newsletter'
import { fetchFinanceSnapshot } from '@/lib/finance/snapshot'
import { invalidateDashboardCache } from '@/lib/cache/tags'
import { recordSyncRun, type SyncSource, type SyncTrigger } from '@/lib/sync/log'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type ProgressEvent =
  | { source: SyncSource; status: 'done' | 'error'; error?: string }
  | { done: true; error?: string; meta?: { fromCache: boolean; cacheAge?: number; generatedAt: string } }

export async function GET(request: NextRequest) {
  const forceRefresh = request.nextUrl.searchParams.get('force') === '1'
  const trigger: SyncTrigger = forceRefresh ? 'manual' : 'auto'

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false
      const send = (event: ProgressEvent) => {
        if (closed) return
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      try {
        const [result] = await Promise.all([
          runDailyOrchestrator(forceRefresh, {
            trigger,
            onProgress: (source, status, detail) => send({ source, status, error: detail }),
          }),
          recordSyncRun('newsletter', trigger, () => fetchNewsletterProjectState({ forceRefresh }))
            .then(() => send({ source: 'newsletter', status: 'done' }))
            .catch(error => send({ source: 'newsletter', status: 'error', error: String(error) })),
          recordSyncRun('finance', trigger, () => fetchFinanceSnapshot(true))
            .then(() => send({ source: 'finance', status: 'done' }))
            .catch(error => send({ source: 'finance', status: 'error', error: String(error) })),
        ])

        invalidateDashboardCache()
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
        send({ done: true, error: String(error) })
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
