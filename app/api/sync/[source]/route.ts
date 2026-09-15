import { NextRequest, NextResponse } from 'next/server'
import { fetchSecondBrainData } from '@/lib/notion/second-brain'
import { fetchCalendarData } from '@/lib/calendar/google'
import { fetchLifeOsData } from '@/lib/notion/life-os'
import { fetchWeatherData } from '@/lib/weather/client'
import { fetchNewsletterProjectState } from '@/lib/notion/newsletter'
import { fetchFinanceSnapshot } from '@/lib/finance/snapshot'
import { invalidateDashboardCache, type DashboardCacheSource } from '@/lib/cache/tags'
import { recordSyncRun, type SyncSource } from '@/lib/sync/log'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

type Source = 'calendar' | 'second-brain' | 'life-os' | 'weather' | 'newsletter' | 'finance'

const FETCHERS: Record<Source, () => Promise<unknown>> = {
  'calendar': fetchCalendarData,
  'second-brain': fetchSecondBrainData,
  'life-os': fetchLifeOsData,
  'weather': fetchWeatherData,
  'newsletter': () => fetchNewsletterProjectState({ forceRefresh: true }),
  'finance': () => fetchFinanceSnapshot(true),
}

const CACHE_SOURCES: Record<Source, DashboardCacheSource> = {
  'calendar': 'calendar',
  'second-brain': 'secondBrain',
  'life-os': 'lifeOs',
  'weather': 'weather',
  'newsletter': 'newsletter',
  'finance': 'finance',
}

const LOG_SOURCES: Record<Source, SyncSource> = {
  'calendar': 'calendar',
  'second-brain': 'second-brain',
  'life-os': 'life-os',
  'weather': 'weather',
  'newsletter': 'newsletter',
  'finance': 'finance',
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ source: string }> },
) {
  const { source } = (await params) as { source: Source }
  const fetcher = FETCHERS[source]

  if (!fetcher) {
    return NextResponse.json({ error: `Unknown source: ${source}` }, { status: 400 })
  }

  try {
    const data = await recordSyncRun(LOG_SOURCES[source], 'manual', fetcher)
    invalidateDashboardCache(CACHE_SOURCES[source])
    return NextResponse.json({ data, source, fetchedAt: new Date().toISOString() })
  } catch (error) {
    console.error(`[api/sync/${source}]`, error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
