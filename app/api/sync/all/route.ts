import { NextRequest, NextResponse } from 'next/server'
import { runDailyOrchestrator } from '@/lib/orchestrator/daily-sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const forceRefresh = request.nextUrl.searchParams.get('force') === '1'

  try {
    const result = await runDailyOrchestrator(forceRefresh)
    return NextResponse.json({
      synthesis: result.synthesis,
      sourceData: result.sourceData,
      meta: {
        fromCache: result.fromCache,
        cacheAge: result.cacheAge,
        generatedAt: result.synthesis.generatedAt,
      },
    })
  } catch (error) {
    console.error('[api/sync/all]', error)
    return NextResponse.json(
      { error: 'Sync failed', message: String(error) },
      { status: 500 },
    )
  }
}
