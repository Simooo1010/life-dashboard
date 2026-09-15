import { unstable_cache } from 'next/cache'
import { fetchCalendarData } from '@/lib/calendar/google'
import { loadDailyContext } from '@/lib/daily-context/service'
import { fetchFinanceSnapshot } from '@/lib/finance/snapshot'
import { fetchLifeOsOverview } from '@/lib/life-os/service'
import { fetchNewsletterProjectState } from '@/lib/notion/newsletter'
import { runDailyOrchestrator } from '@/lib/orchestrator/daily-sync'
import { getContextualSecondBrain } from '@/lib/second-brain/service'
import { fetchWeatherData } from '@/lib/weather/client'
import { DASHBOARD_CACHE_TAGS } from './tags'

export { DASHBOARD_CACHE_TAGS, invalidateDashboardCache } from './tags'
export type { DashboardCacheSource } from './tags'

const sharedTag = DASHBOARD_CACHE_TAGS.all

export const loadCachedDailyDashboard = unstable_cache(
  () => runDailyOrchestrator(false),
  ['dashboard-daily-v1'],
  {
    revalidate: 300,
    tags: [
      sharedTag,
      DASHBOARD_CACHE_TAGS.calendar,
      DASHBOARD_CACHE_TAGS.lifeOs,
      DASHBOARD_CACHE_TAGS.secondBrain,
      DASHBOARD_CACHE_TAGS.weather,
    ],
  },
)

export const loadCachedCalendar = unstable_cache(
  fetchCalendarData,
  ['dashboard-calendar-v1'],
  { revalidate: 60, tags: [sharedTag, DASHBOARD_CACHE_TAGS.calendar] },
)

export const loadCachedFinanceSnapshot = unstable_cache(
  () => fetchFinanceSnapshot(false),
  ['dashboard-finance-v1'],
  { revalidate: 300, tags: [sharedTag, DASHBOARD_CACHE_TAGS.finance] },
)

export const loadCachedLifeOsOverview = unstable_cache(
  fetchLifeOsOverview,
  ['dashboard-life-os-v1'],
  {
    revalidate: 300,
    tags: [sharedTag, DASHBOARD_CACHE_TAGS.lifeOs, DASHBOARD_CACHE_TAGS.calendar],
  },
)

export const loadCachedNewsletter = unstable_cache(
  () => fetchNewsletterProjectState(),
  ['dashboard-newsletter-v1'],
  { revalidate: 300, tags: [sharedTag, DASHBOARD_CACHE_TAGS.newsletter] },
)

export const loadCachedWeather = unstable_cache(
  fetchWeatherData,
  ['dashboard-weather-v1'],
  { revalidate: 600, tags: [sharedTag, DASHBOARD_CACHE_TAGS.weather] },
)

export const loadCachedSecondBrainPage = unstable_cache(
  async () => {
    const calendar = await loadCachedCalendar()
    const lifeOs = await loadCachedLifeOsOverview()
    const context = await loadDailyContext({ calendar, lifeOs, includeNewsletter: false })
    try {
      const result = await getContextualSecondBrain(context.context, { fastMode: true })
      return { context, result }
    } catch (error) {
      console.error('[SecondBrainPage]', error)
      return {
        context,
        result: {
          relevantToday: [],
          rediscover: [],
          generatedAt: new Date().toISOString(),
          contextHash: context.context.contextHash,
          knowledgeRevisionHash: 'unavailable',
          sourceStatuses: [
            { source: 'knowledge-graph' as const, state: 'unavailable' as const, message: 'Fonte Notion momentaneamente non disponibile' },
            { source: 'semantic-ranking' as const, state: 'unavailable' as const },
            { source: 'history' as const, state: 'unavailable' as const },
          ],
          fromCache: false,
        },
      }
    }
  },
  ['dashboard-second-brain-v1'],
  {
    revalidate: 300,
    tags: [
      sharedTag,
      DASHBOARD_CACHE_TAGS.secondBrain,
      DASHBOARD_CACHE_TAGS.calendar,
      DASHBOARD_CACHE_TAGS.lifeOs,
    ],
  },
)
