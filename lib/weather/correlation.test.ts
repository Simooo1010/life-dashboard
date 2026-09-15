import { describe, expect, it, vi } from 'vitest'
import type { CalendarEvent } from '@/lib/calendar/google'
import type { NormalizedWeatherData } from './types'

const stubs = vi.hoisted(() => ({
  correlate: vi.fn(async () => [{
    eventId: 'event-1',
    eventTitle: 'Allenamento',
    timeString: '18:00',
    severity: 'warning' as const,
    message: 'Pioggia intensa.',
  }]),
}))

vi.mock('@/lib/groq/event-weather-correlation', () => ({
  correlateEventsWithWeatherAI: stubs.correlate,
}))

import { correlateCalendarWithWeather } from './correlation'

describe('correlateCalendarWithWeather', () => {
  it('does not block the fast page-load path on AI event correlation', async () => {
    const event = {
      id: 'event-1', title: 'Allenamento', start: '2026-09-14T18:00:00', end: '2026-09-14T20:00:00',
      isAllDay: false, category: 'sport', calendarId: 'primary',
    } satisfies CalendarEvent
    const weather = {
      todayMin: 16,
      todayMax: 24,
      current: { temperature: 20, conditionText: 'Pioggia', windSpeed: 10 },
      periods: [{ label: 'Sera', temperature: 18, conditionText: 'Pioggia', rainProbability: 80, condition: 'heavy_rain' }],
      location: { name: 'Roma' },
    } as NormalizedWeatherData

    const result = await correlateCalendarWithWeather([event], weather, { fastMode: true })

    expect(result.eventAlerts).toEqual([])
    expect(stubs.correlate).not.toHaveBeenCalled()
    expect(result.rainRisk).toBe('high')
  })
})
