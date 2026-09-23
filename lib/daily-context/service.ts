import { fetchCalendarData, type CalendarData } from '@/lib/calendar/google'
import { fetchLifeOsData } from '@/lib/notion/life-os'
import { buildLifeOsOverview } from '@/lib/life-os/interpret'
import type { LifeOsOverview } from '@/lib/life-os/types'
import { buildDailyContext } from './build'
import { fetchNewsletterProjectState } from '@/lib/notion/newsletter'
import type { NewsletterStateItem } from '@/lib/newsletter/types'
import type { NewsletterContextState } from './build'
import type { DailyContextResult } from './types'

export interface DailyContextOptions {
  calendar?: CalendarData
  lifeOs?: LifeOsOverview
  now?: Date
  timeZone?: string
  includeNewsletter?: boolean
}

// Reuses the newsletter interpreter (and its in-process cache) so the daily
// context sees the same current focus as the newsletter page, instead of a
// second full page download scanned for the first "focus"-looking line.
async function fetchNewsletterContext(): Promise<NewsletterContextState | null> {
  if (!process.env.NOTION_TOKEN && !process.env.NOTION_TOKEN_SECOND_BRAIN) return null
  try {
    const state = await fetchNewsletterProjectState()
    const item = (entry: NewsletterStateItem) => ({ id: entry.id, title: entry.title, ...(entry.detail ? { detail: entry.detail } : {}), ...(entry.date ? { date: entry.date } : {}) })
    return {
      pageUrl: state.source.pageUrl,
      fetchedAt: state.source.fetchedAt,
      currentFocus: state.pulse.currentFocus,
      nextMilestone: state.pulse.nextMilestone,
      blockers: state.blockers.map(item),
      milestones: state.milestones.map(item),
    }
  } catch { return null }
}

export async function loadDailyContext(options: DailyContextOptions = {}): Promise<DailyContextResult> {
  const now = options.now ?? new Date()
  const timeZone = options.timeZone ?? process.env.WEATHER_TIMEZONE ?? 'Europe/Rome'
  const [calendarResult, lifeOsResult, newsletterResult] = await Promise.allSettled([
    options.calendar ? Promise.resolve(options.calendar) : fetchCalendarData(),
    options.lifeOs ? Promise.resolve(options.lifeOs) : (async () => buildLifeOsOverview(await fetchLifeOsData(), options.calendar ?? await fetchCalendarData(), { now, timeZone }))(),
    options.includeNewsletter === false ? Promise.resolve(null) : fetchNewsletterContext(),
  ])
  const calendar = calendarResult.status === 'fulfilled' ? calendarResult.value : { todayEvents: [], upcomingEvents: [], fetchedAt: now.toISOString() }
  const lifeOs = lifeOsResult.status === 'fulfilled' ? lifeOsResult.value : null
  const newsletter = newsletterResult.status === 'fulfilled' ? newsletterResult.value : null
  const context = buildDailyContext({ now, timeZone, calendar, lifeOs, newsletter })
  return { context, rawSources: { calendar, lifeOs, newsletter } }
}
