import { fetchCalendarData, type CalendarData } from '@/lib/calendar/google'
import { NOTION_PAGES } from '@/lib/notion/client'
import { fetchLifeOsData } from '@/lib/notion/life-os'
import { buildLifeOsOverview } from './interpret'
import type { LifeOsOverview, LifeOsSnapshot } from './types'

export interface FetchLifeOsOverviewOptions {
  fetchNotion?: () => Promise<LifeOsSnapshot>
  fetchCalendar?: () => Promise<CalendarData>
  now?: Date
  timeZone?: string
}

function pageUrl(): string {
  return `https://app.notion.com/p/Life-OS-Managing-${NOTION_PAGES.lifeOsManaging.replace(/-/g, '')}`
}

function unavailableNotion(message: string, checkedAt: string): LifeOsSnapshot {
  return {
    pageUrl: pageUrl(),
    title: 'Life OS Managing',
    items: [],
    schedule: [],
    sources: [{
      source: 'notion',
      label: 'Notion · Life OS',
      state: 'unavailable',
      checkedAt,
      message,
    }],
    fetchedAt: checkedAt,
  }
}

function unavailableCalendar(message: string, checkedAt: string): CalendarData {
  return {
    todayEvents: [],
    upcomingEvents: [],
    fetchedAt: checkedAt,
    availability: 'unavailable',
    error: message,
  }
}

export async function fetchLifeOsOverview(
  options: FetchLifeOsOverviewOptions = {},
): Promise<LifeOsOverview> {
  const checkedAt = new Date().toISOString()
  const [notionResult, calendarResult] = await Promise.allSettled([
    (options.fetchNotion ?? fetchLifeOsData)(),
    (options.fetchCalendar ?? fetchCalendarData)(),
  ])

  const notionData = notionResult.status === 'fulfilled'
    ? notionResult.value
    : unavailableNotion(
      notionResult.reason instanceof Error ? notionResult.reason.message : 'Fonte Notion non disponibile.',
      checkedAt,
    )
  const calendarData = calendarResult.status === 'fulfilled'
    ? calendarResult.value
    : unavailableCalendar(
      calendarResult.reason instanceof Error ? calendarResult.reason.message : 'Fonte Calendar non disponibile.',
      checkedAt,
    )

  return buildLifeOsOverview(notionData, calendarData, {
    now: options.now ?? new Date(),
    timeZone: options.timeZone ?? process.env.WEATHER_TIMEZONE ?? 'Europe/Rome',
  })
}
