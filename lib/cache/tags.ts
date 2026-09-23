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

// Tags for the background refresh of cheap, non-Notion sources. Unlike the
// source tags above they are not attached to the Notion-backed loaders that
// merely consume calendar data (Life OS overview, Second Brain), so a routine
// calendar refresh does not cascade into a burst of Notion requests.
export const BACKGROUND_REFRESH_TAGS = {
  calendar: 'dashboard:bg:calendar',
  finance: 'dashboard:bg:finance',
  weather: 'dashboard:bg:weather',
} as const

export type DashboardCacheSource = Exclude<keyof typeof DASHBOARD_CACHE_TAGS, 'all'>
export type BackgroundRefreshSource = keyof typeof BACKGROUND_REFRESH_TAGS

export function invalidateDashboardCache(source?: DashboardCacheSource): void {
  revalidateTag(source ? DASHBOARD_CACHE_TAGS[source] : DASHBOARD_CACHE_TAGS.all)
}

export function invalidateBackgroundSource(source: BackgroundRefreshSource): void {
  revalidateTag(BACKGROUND_REFRESH_TAGS[source])
}
