import { NextResponse } from 'next/server'
import { after } from 'next/server'
import { getLastSuccessMap } from '@/lib/sync/log'
import { invalidateDashboardCache, type DashboardCacheSource } from '@/lib/cache/tags'
import {
  loadCachedCalendar,
  loadCachedFinanceSnapshot,
  loadCachedLifeOsOverview,
  loadCachedNewsletter,
  loadCachedSecondBrainPage,
  loadCachedWeather,
} from '@/lib/cache/dashboard-data'
import type { SyncSource } from '@/lib/sync/log'

export const dynamic = 'force-dynamic'

// Mirrors the unstable_cache `revalidate` windows in lib/cache/dashboard-data.ts.
const TTL_MS: Record<DashboardCacheSource, number> = {
  calendar: 60_000,
  finance: 300_000,
  lifeOs: 300_000,
  newsletter: 300_000,
  secondBrain: 300_000,
  weather: 600_000,
}

const REFRESHERS: Record<DashboardCacheSource, () => Promise<unknown>> = {
  calendar: loadCachedCalendar,
  finance: loadCachedFinanceSnapshot,
  lifeOs: loadCachedLifeOsOverview,
  newsletter: loadCachedNewsletter,
  secondBrain: loadCachedSecondBrainPage,
  weather: loadCachedWeather,
}

const LOG_SOURCE_BY_CACHE: Record<DashboardCacheSource, SyncSource> = {
  calendar: 'calendar',
  finance: 'finance',
  lifeOs: 'life-os',
  newsletter: 'newsletter',
  secondBrain: 'second-brain',
  weather: 'weather',
}

/**
 * Called fire-and-forget on page entry (see BackgroundSyncTrigger). Responds
 * immediately with 202, then — after the response is sent, via `after()` —
 * refreshes any source whose last successful sync is older than its normal
 * cache window. Keeps first paint instant while catching up stale data
 * within a few seconds of opening the app.
 */
export async function POST() {
  after(async () => {
    try {
      const lastSuccess = await getLastSuccessMap()
      const now = Date.now()
      const staleSources = (Object.keys(TTL_MS) as DashboardCacheSource[]).filter(source => {
        const last = lastSuccess[LOG_SOURCE_BY_CACHE[source]]
        if (!last) return true
        return now - new Date(last).getTime() > TTL_MS[source]
      })

      if (staleSources.length === 0) return

      staleSources.forEach(source => invalidateDashboardCache(source))
      await Promise.allSettled(staleSources.map(source => REFRESHERS[source]()))
    } catch (err) {
      console.warn('[refresh-stale] background refresh failed:', err)
    }
  })

  return NextResponse.json({ scheduled: true }, { status: 202 })
}
