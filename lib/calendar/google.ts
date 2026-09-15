// ─── Types ────────────────────────────────────────────────────────────────────
export type EventCategory =
  | 'school'
  | 'sport'
  | 'health'
  | 'personal'
  | 'newsletter'
  | 'other'

export interface CalendarEvent {
  id: string
  title: string
  start: string    // ISO datetime or date (YYYY-MM-DD)
  end: string      // ISO datetime or date
  isAllDay: boolean
  category: EventCategory
  description?: string
  location?: string
  calendarId: string
}

// ─── Category classifier ───────────────────────────────────────────────────────
const SPORT_KEYWORDS = ['pallavolo', 'volleyball', 'allenamento', 'partita', 'gara', 'sport', 'palestra', 'gym', 'corsa', 'piscina']
const SCHOOL_KEYWORDS = ['scuola', 'lezione', 'verifica', 'compito', 'interrogazione', 'esame', 'school', 'class', 'lecture', 'liceo', 'studio']
const HEALTH_KEYWORDS = ['medico', 'dottore', 'dentista', 'visita', 'doctor', 'appointment', 'health', 'salute']
const NEWSLETTER_KEYWORDS = ['newsletter', 'articolo', 'article', 'writing', 'scrittura', 'publish', 'bozza']

function matchesKeyword(text: string, keyword: string): boolean {
  return new RegExp(`\\b${keyword}\\b`, 'i').test(text)
}

function classifyEvent(title: string, description?: string): EventCategory {
  const text = `${title} ${description ?? ''}`
  if (SPORT_KEYWORDS.some(k => matchesKeyword(text, k))) return 'sport'
  if (SCHOOL_KEYWORDS.some(k => matchesKeyword(text, k))) return 'school'
  if (HEALTH_KEYWORDS.some(k => matchesKeyword(text, k))) return 'health'
  if (NEWSLETTER_KEYWORDS.some(k => matchesKeyword(text, k))) return 'newsletter'
  return 'other'
}

// ─── iCal parser for secret .ics URL ──────────────────────────────────────────
function formatIcsDate(raw: string): string {
  if (!raw) return ''
  const clean = raw.replace(/[^0-9TZ]/g, '')
  if (clean.length === 8) {
    return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`
  }
  if (clean.length >= 15) {
    const isUtc = clean.endsWith('Z')
    return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}T${clean.slice(9, 11)}:${clean.slice(11, 13)}:${clean.slice(13, 15)}${isUtc ? 'Z' : ''}`
  }
  return ''
}

function decodeHtmlEntities(value: string): string {
  const named: Record<string, string> = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"',
  }

  return value.replace(/&(#(?:x[0-9a-f]+|\d+)|amp|apos|gt|lt|nbsp|quot);/gi, (entity, token: string) => {
    if (!token.startsWith('#')) return named[token.toLowerCase()] ?? entity

    const hexadecimal = token[1]?.toLowerCase() === 'x'
    const codePoint = Number.parseInt(token.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10)
    try {
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity
    } catch {
      return entity
    }
  })
}

function calendarPlainText(value: string): string {
  return decodeHtmlEntities(
    value
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<\/p\s*>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  ).replace(/\s+/g, ' ').trim()
}

export function parseIcsFeed(icsText: string, calendarId: string = 'primary'): CalendarEvent[] {
  const events: CalendarEvent[] = []
  const blocks = icsText.split('BEGIN:VEVENT')

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split('END:VEVENT')[0]
    const getField = (prefix: string): string => {
      const match = block.match(new RegExp(`(?:^|\\r?\\n)${prefix}(?:;[^:]*)?:(.*(?:\\r?\\n[ \\t].*)*)`, 'm'))
      if (!match) return ''
      return match[1].replace(/\r?\n[ \t]/g, '').trim()
    }

    const uid = getField('UID') || Math.random().toString()
    const summary = getField('SUMMARY').replace(/\\([,;Nn\\])/g, '$1') || '(senza titolo)'
    const rawDescription = getField('DESCRIPTION').replace(/\\([,;Nn\\])/g, '$1')
    const description = calendarPlainText(rawDescription) || undefined
    const location = getField('LOCATION').replace(/\\([,;Nn\\])/g, '$1') || undefined

    const dtstart = getField('DTSTART')
    const dtend = getField('DTEND')

    const isAllDay = !dtstart.includes('T')
    const start = formatIcsDate(dtstart)
    const end = formatIcsDate(dtend) || start

    if (!start) continue

    events.push({
      id: uid,
      title: summary,
      start,
      end,
      isAllDay,
      category: classifyEvent(summary, description),
      description,
      location,
      calendarId,
    })
  }

  return events
}

// ─── Fetcher ────────────────────────────────────────────────────────────────
export interface CalendarData {
  todayEvents: CalendarEvent[]
  upcomingEvents: CalendarEvent[]  // next 7 days, excluding today
  fetchedAt: string
  availability?: 'available' | 'unavailable'
  error?: string
}

export async function fetchCalendarData(): Promise<CalendarData> {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayStr = todayStart.toISOString().split('T')[0]
  const tomorrowStr = new Date(todayStart.getTime() + 86400000).toISOString().split('T')[0]
  const in7DaysStr = new Date(todayStart.getTime() + 7 * 86400000).toISOString().split('T')[0]

  const icalUrl = process.env.GOOGLE_CALENDAR_ICAL_URL
  if (!icalUrl) {
    console.warn('[fetchCalendarData] GOOGLE_CALENDAR_ICAL_URL non impostato in .env.local')
    return { todayEvents: [], upcomingEvents: [], fetchedAt: new Date().toISOString(), availability: 'unavailable', error: 'Feed Calendar non configurato.' }
  }

  try {
    const res = await fetch(icalUrl, { cache: 'no-store' })
    if (!res.ok) {
      console.warn(`[fetchCalendarData] Fetch iCal fallito con status: ${res.status}`)
      return { todayEvents: [], upcomingEvents: [], fetchedAt: new Date().toISOString(), availability: 'unavailable', error: `Feed Calendar non disponibile (${res.status}).` }
    }

    const text = await res.text()
    const allEvents = parseIcsFeed(text, 'primary')

    const todayEvents = allEvents
      .filter(e => {
        const day = e.isAllDay ? e.start : e.start.split('T')[0]
        return day === todayStr
      })
      .sort((a, b) => a.start.localeCompare(b.start))

    const upcomingEvents = allEvents
      .filter(e => {
        const day = e.isAllDay ? e.start : e.start.split('T')[0]
        return day >= tomorrowStr && day <= in7DaysStr
      })
      .sort((a, b) => a.start.localeCompare(b.start))

    return { todayEvents, upcomingEvents, fetchedAt: new Date().toISOString(), availability: 'available' }
  } catch (err) {
    console.error('[fetchCalendarData] Errore fetch/parsing iCal:', err)
    return { todayEvents: [], upcomingEvents: [], fetchedAt: new Date().toISOString(), availability: 'unavailable', error: 'Errore durante la lettura del feed Calendar.' }
  }
}
