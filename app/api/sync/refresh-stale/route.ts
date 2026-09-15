import { NextResponse } from 'next/server'
import { after } from 'next/server'
import { getLastSuccessMap } from '@/lib/sync/log'
import { invalidateDashboardCache, type DashboardCacheSource } from '@/lib/cache/tags'
import {
  loadCachedCalendar,
  loadCachedFinanceSnapshot,
  loadCachedWeather,
} from '@/lib/cache/dashboard-data'
import type { SyncSource } from '@/lib/sync/log'

export const dynamic = 'force-dynamic'

// Only calendar/weather/finance are proactively refreshed in the background.
// Life OS, Second Brain and Newsletter all hit Notion, which shares one
// rate-limit bucket — each page already keeps its own copy of that data
// fresh via a dedicated unstable_cache loader on visit, so refreshing them
// again here on every page load doubles Notion traffic for no benefit and
// trips 429s in production.
type BackgroundRefreshSource = Extract<DashboardCacheSource, 'calendar' | 'finance' | 'weather'>

// Mirrors the unstable_cache `revalidate` windows in lib/cache/dashboard-data.ts.
const TTL_MS: Record<BackgroundRefreshSource, number> = {
  calendar: 60_000,
  finance: 300_000,
  weather: 600_000,
}

const REFRESHERS: Record<BackgroundRefreshSource, () => Promise<unknown>> = {
  calendar: loadCachedCalendar,
  finance: loadCachedFinanceSnapshot,
  weather: loadCachedWeather,
}

const LOG_SOURCE_BY_CACHE: Record<BackgroundRefreshSource, SyncSource> = {
  calendar: 'calendar',
  finance: 'finance',
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
      const staleSources = (Object.keys(TTL_MS) as BackgroundRefreshSource[]).filter(source => {
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
