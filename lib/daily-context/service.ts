import { fetchCalendarData, type CalendarData } from '@/lib/calendar/google'
import { fetchLifeOsData } from '@/lib/notion/life-os'
import { buildLifeOsOverview } from '@/lib/life-os/interpret'
import type { LifeOsOverview } from '@/lib/life-os/types'
import { buildDailyContext } from './build'
import { notion, NOTION_PAGES } from '@/lib/notion/client'
import { fetchPageContent } from '@/lib/notion/blocks'
import type { NewsletterContextState } from './build'
import type { DailyContextResult } from './types'

export interface DailyContextOptions {
  calendar?: CalendarData
  lifeOs?: LifeOsOverview
  now?: Date
  timeZone?: string
}

async function fetchNewsletterContext(): Promise<NewsletterContextState | null> {
  if (!process.env.NOTION_TOKEN && !process.env.NOTION_TOKEN_SECOND_BRAIN) return null
  try {
    const page = await notion.pages.retrieve({ page_id: NOTION_PAGES.newsletterBrief })
    const content = await fetchPageContent(NOTION_PAGES.newsletterBrief)
    const lines = content.split('\n').map(line => line.trim()).filter(Boolean)
    const matching = (pattern: RegExp) => lines.find(line => pattern.test(line))?.replace(/^[-•#\s]+/, '').trim()
    return {
      pageUrl: 'url' in page && typeof page.url === 'string' ? page.url : 'https://app.notion.com/p/' + NOTION_PAGES.newsletterBrief.replace(/-/g, ''),
      fetchedAt: new Date().toISOString(),
      currentFocus: matching(/focus|priorit|obiettivo|current/i),
      nextMilestone: matching(/milestone|next|prossim|scadenza/i),
      blockers: [],
      milestones: [],
    }
  } catch { return null }
}

export async function loadDailyContext(options: DailyContextOptions = {}): Promise<DailyContextResult> {
  const now = options.now ?? new Date()
  const timeZone = options.timeZone ?? process.env.WEATHER_TIMEZONE ?? 'Europe/Rome'
  const [calendarResult, lifeOsResult, newsletterResult] = await Promise.allSettled([
    options.calendar ? Promise.resolve(options.calendar) : fetchCalendarData(),
    options.lifeOs ? Promise.resolve(options.lifeOs) : (async () => buildLifeOsOverview(await fetchLifeOsData(), options.calendar ?? await fetchCalendarData(), { now, timeZone }))(),
    fetchNewsletterContext(),
  ])
  const calendar = calendarResult.status === 'fulfilled' ? calendarResult.value : { todayEvents: [], upcomingEvents: [], fetchedAt: now.toISOString() }
  const lifeOs = lifeOsResult.status === 'fulfilled' ? lifeOsResult.value : null
  const newsletter = newsletterResult.status === 'fulfilled' ? newsletterResult.value : null
  const context = buildDailyContext({ now, timeZone, calendar, lifeOs, newsletter })
  return { context, rawSources: { calendar, lifeOs, newsletter } }
}
