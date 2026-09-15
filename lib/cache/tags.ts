import { revalidateTag } from 'next/cache'

export const DASHBOARD_CACHE_TAGS = {
  all: 'dashboard:all',
  calendar: 'dashboard:calendar',
  finance: 'dashboard:finance',
  lifeOs: 'dashboard:life-os',
  newsletter: 'dashboard:newsletter',
  secondBrain: 'dashboard:second-brain',
  weather: 'dashboard:weather',
} as const

export type DashboardCacheSource = Exclude<keyof typeof DASHBOARD_CACHE_TAGS, 'all'>

export function invalidateDashboardCache(source?: DashboardCacheSource): void {
  revalidateTag(source ? DASHBOARD_CACHE_TAGS[source] : DASHBOARD_CACHE_TAGS.all)
}
