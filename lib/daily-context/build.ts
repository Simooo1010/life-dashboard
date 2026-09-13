import { createHash } from 'node:crypto'
import type { CalendarData, CalendarEvent } from '../calendar/google'
import { addLocalDays, toLocalDateKey } from '../life-os/dates'
import type { LifeOsOverview, OperationalItem } from '../life-os/types'
import type { DailyContext, DailyContextFact, DailyContextSourceStatus } from './types'

export interface NewsletterContextItem {
  id: string
  title: string
  detail?: string
  date?: string
}

export interface NewsletterContextState {
  pageUrl: string
  fetchedAt: string
  currentFocus?: string
  nextMilestone?: string
  blockers: NewsletterContextItem[]
  milestones: NewsletterContextItem[]
}

export interface DailyContextInput {
  now: Date
  timeZone: string
  calendar: CalendarData
  lifeOs: LifeOsOverview | null
  newsletter: NewsletterContextState | null
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'into', 'that', 'this', 'una', 'uno', 'con', 'per',
  'della', 'delle', 'degli', 'del', 'nel', 'nella', 'che', 'gli', 'alla', 'alle', 'dei',
])

export function tokenizeContext(value: string): string[] {
  return Array.from(new Set(value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter(token => token.length >= 3 && !STOP_WORDS.has(token))))
}

function urgencyFor(date: string | null, localDate: string): DailyContextFact['urgency'] {
  if (!date) return 'background'
  const dateKey = date.slice(0, 10)
  if (dateKey < localDate) return 'overdue'
  if (dateKey === localDate) return 'today'
  return 'soon'
}

function calendarFact(event: CalendarEvent, localDate: string, timeZone: string): DailyContextFact {
  const detail = [event.description, event.location].filter(Boolean).join(' · ') || null
  return {
    id: `calendar:${event.id}`,
    source: 'calendar',
    kind: event.category,
    title: event.title,
    detail,
    occursAt: event.start,
    urgency: urgencyFor(toLocalDateKey(event.start, timeZone), localDate),
    sourceUrl: null,
    tokens: tokenizeContext(`${event.title} ${detail ?? ''} ${event.category}`),
  }
}

function lifeOsFact(item: OperationalItem, localDate: string): DailyContextFact {
  const detail = [item.subject, item.domain, item.priority].filter(Boolean).join(' · ') || null
  return {
    id: `life-os:${item.id}`,
    source: 'life-os',
    kind: item.type,
    title: item.title,
    detail,
    occursAt: item.start ?? item.date,
    urgency: urgencyFor(item.date, localDate),
    sourceUrl: item.sourceUrl ?? null,
    tokens: tokenizeContext(`${item.title} ${detail ?? ''} ${item.type}`),
  }
}

function newsletterFact(
  id: string,
  kind: string,
  title: string,
  detail: string | null,
  date: string | null,
  state: NewsletterContextState,
  localDate: string,
): DailyContextFact {
  return {
    id: `newsletter:${id}`,
    source: 'newsletter',
    kind,
    title,
    detail,
    occursAt: date,
    urgency: urgencyFor(date, localDate),
    sourceUrl: state.pageUrl,
    tokens: tokenizeContext(`${title} ${detail ?? ''} newsletter ${kind}`),
  }
}

function sourceStatus(
  source: DailyContextSourceStatus['source'],
  available: boolean,
  hasData: boolean,
  checkedAt: string,
): DailyContextSourceStatus {
  return {
    source,
    state: available ? (hasData ? 'available' : 'empty') : 'unavailable',
    checkedAt,
  }
}

function factDate(fact: DailyContextFact, timeZone: string): string | null {
  return fact.occursAt ? toLocalDateKey(fact.occursAt, timeZone) : null
}

function isAssessment(fact: DailyContextFact): boolean {
  return /assessment|test|exam|verifica|interrogazione|written|oral/i.test(`${fact.kind} ${fact.title}`)
}

export function buildDailyContext(input: DailyContextInput): DailyContext {
  const localDate = toLocalDateKey(input.now, input.timeZone)
  const thirdDay = addLocalDays(localDate, 3)
  const facts: DailyContextFact[] = []

  for (const event of [...input.calendar.todayEvents, ...input.calendar.upcomingEvents]) {
    facts.push(calendarFact(event, localDate, input.timeZone))
  }

  if (input.lifeOs) {
    const items = [
      ...input.lifeOs.today,
      ...input.lifeOs.tomorrow,
      ...input.lifeOs.nextSevenDays.flatMap(day => day.items),
      ...input.lifeOs.otherAreas.flatMap(area => area.items),
    ]
    const seen = new Set<string>()
    for (const item of items) {
      if (seen.has(item.id)) continue
      seen.add(item.id)
      facts.push(lifeOsFact(item, localDate))
    }
  }

  if (input.newsletter) {
    if (input.newsletter.currentFocus?.trim()) {
      facts.push(newsletterFact(
        'current-focus',
        'current-focus',
        input.newsletter.currentFocus,
        null,
        null,
        input.newsletter,
        localDate,
      ))
    }
    for (const blocker of input.newsletter.blockers) {
      facts.push(newsletterFact(blocker.id, 'blocker', blocker.title, blocker.detail ?? null, blocker.date ?? null, input.newsletter, localDate))
    }
    for (const milestone of input.newsletter.milestones) {
      facts.push(newsletterFact(milestone.id, 'milestone', milestone.title, milestone.detail ?? null, milestone.date ?? null, input.newsletter, localDate))
    }
    if (input.newsletter.milestones.length === 0 && input.newsletter.nextMilestone?.trim()) {
      facts.push(newsletterFact('next-milestone', 'milestone', input.newsletter.nextMilestone, null, null, input.newsletter, localDate))
    }
  }

  const datedFacts = facts.map(fact => ({ fact, date: factDate(fact, input.timeZone) }))
  const todayCount = datedFacts.filter(item => item.date === localDate).length
  const nextThreeDaysCount = datedFacts.filter(item => item.date && item.date >= localDate && item.date <= thirdDay).length
  const assessmentCount = facts.filter(isAssessment).length
  const concentration = nextThreeDaysCount >= 4 ? 'high' : nextThreeDaysCount >= 2 ? 'medium' : 'low'
  const workload = { todayCount, nextThreeDaysCount, assessmentCount, concentration } as const
  const sourceStatuses = [
    sourceStatus('calendar', true, input.calendar.todayEvents.length + input.calendar.upcomingEvents.length > 0, input.calendar.fetchedAt),
    sourceStatus('life-os', Boolean(input.lifeOs), Boolean(input.lifeOs && facts.some(fact => fact.source === 'life-os')), input.lifeOs?.generatedAt ?? input.now.toISOString()),
    sourceStatus('newsletter', Boolean(input.newsletter), Boolean(input.newsletter && facts.some(fact => fact.source === 'newsletter')), input.newsletter?.fetchedAt ?? input.now.toISOString()),
  ]

  const hashPayload = facts.map(fact => ({
    id: fact.id,
    kind: fact.kind,
    title: fact.title,
    detail: fact.detail,
    occursAt: fact.occursAt,
    urgency: fact.urgency,
  }))
  const contextHash = createHash('sha256')
    .update(JSON.stringify({ localDate, timeZone: input.timeZone, facts: hashPayload, workload }))
    .digest('hex')

  return { localDate, timeZone: input.timeZone, facts, workload, sourceStatuses, contextHash }
}
