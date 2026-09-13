import type { CalendarData, CalendarEvent } from '../calendar/google'
import type { NewsletterProjectState } from './types'

function normalized(value: string): string {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
}

export function findProjectCalendarEvents(state: NewsletterProjectState, calendar: CalendarData): CalendarEvent[] {
  const phrases = [state.projectName, ...state.components.map(component => component.name)]
    .map(normalized)
    .filter(phrase => phrase.length >= 5)
  return [...calendar.todayEvents, ...calendar.upcomingEvents].filter(event => {
    if (event.category === 'newsletter') return true
    const haystack = normalized(`${event.title} ${event.description ?? ''}`)
    return phrases.some(phrase => haystack.includes(phrase))
  })
}
