import { beforeEach, describe, expect, it, vi } from 'vitest'

const stubs = vi.hoisted(() => ({
  unstableCache: vi.fn((
    loader: (...args: never[]) => unknown,
    _key?: string[],
    _options?: { revalidate?: number; tags?: string[] },
  ) => loader),
  revalidateTag: vi.fn(),
  secondBrain: vi.fn(async () => ({ kind: 'second-brain' })),
}))

vi.mock('next/cache', () => ({
  unstable_cache: stubs.unstableCache,
  revalidateTag: stubs.revalidateTag,
}))
vi.mock('@/lib/orchestrator/daily-sync', () => ({ runDailyOrchestrator: vi.fn(async () => ({ kind: 'daily' })) }))
vi.mock('@/lib/calendar/google', () => ({ fetchCalendarData: vi.fn(async () => ({ kind: 'calendar' })) }))
vi.mock('@/lib/finance/snapshot', () => ({ fetchFinanceSnapshot: vi.fn(async () => ({ kind: 'finance' })) }))
vi.mock('@/lib/life-os/service', () => ({ fetchLifeOsOverview: vi.fn(async () => ({ kind: 'life-os' })) }))
vi.mock('@/lib/notion/newsletter', () => ({ fetchNewsletterProjectState: vi.fn(async () => ({ kind: 'newsletter' })) }))
vi.mock('@/lib/weather/client', () => ({ fetchWeatherData: vi.fn(async () => ({ kind: 'weather' })) }))
vi.mock('@/lib/daily-context/service', () => ({ loadDailyContext: vi.fn(async () => ({ context: { contextHash: 'today' } })) }))
vi.mock('@/lib/second-brain/service', () => ({ getContextualSecondBrain: stubs.secondBrain }))

import {
  DASHBOARD_CACHE_TAGS,
  invalidateDashboardCache,
  loadCachedCalendar,
  loadCachedDailyDashboard,
  loadCachedSecondBrainPage,
} from './dashboard-data'

describe('dashboard data cache', () => {
  beforeEach(() => stubs.revalidateTag.mockClear())

  it('registers persistent caches with bounded freshness and dependency tags', () => {
    const registrations = stubs.unstableCache.mock.calls.map(call => ({
      key: call[1],
      options: call[2],
    }))

    expect(registrations).toContainEqual({
      key: ['dashboard-daily-v1'],
      options: expect.objectContaining({
        revalidate: 300,
        tags: expect.arrayContaining([
          DASHBOARD_CACHE_TAGS.all,
          DASHBOARD_CACHE_TAGS.calendar,
          DASHBOARD_CACHE_TAGS.lifeOs,
          DASHBOARD_CACHE_TAGS.secondBrain,
          DASHBOARD_CACHE_TAGS.weather,
        ]),
      }),
    })
    expect(registrations).toContainEqual({
      key: ['dashboard-calendar-v1'],
      options: expect.objectContaining({ revalidate: 60 }),
    })
  })

  it('keeps the cached loader API transparent to pages', async () => {
    await expect(loadCachedDailyDashboard()).resolves.toEqual({ kind: 'daily' })
    await expect(loadCachedCalendar()).resolves.toEqual({ kind: 'calendar' })
  })

  it('invalidates one source without evicting unrelated source caches', () => {
    invalidateDashboardCache('calendar')
    expect(stubs.revalidateTag).toHaveBeenCalledExactlyOnceWith(DASHBOARD_CACHE_TAGS.calendar)
  })

  it('can invalidate every dashboard view after a full refresh', () => {
    invalidateDashboardCache()
    expect(stubs.revalidateTag).toHaveBeenCalledExactlyOnceWith(DASHBOARD_CACHE_TAGS.all)
  })

  it('returns an explicit unavailable result when Second Brain is throttled', async () => {
    stubs.secondBrain.mockRejectedValueOnce(new Error('rate limited'))

    const pageData = await loadCachedSecondBrainPage()

    expect(pageData.result.relevantToday).toEqual([])
    expect(pageData.result.sourceStatuses).toContainEqual(expect.objectContaining({
      source: 'knowledge-graph',
      state: 'unavailable',
    }))
  })
})
