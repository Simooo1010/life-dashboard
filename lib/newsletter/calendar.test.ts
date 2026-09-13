import { describe, expect, it } from 'vitest'
import { findProjectCalendarEvents } from './calendar'
import type { NewsletterProjectState } from './types'

const state = {
  projectName: 'AI, But clearer',
  components: [{ id: 'c', name: 'Community lab', evidenceBlockIds: ['b'] }],
} as NewsletterProjectState

describe('findProjectCalendarEvents', () => {
  it('matches the project identity and newly derived components without a channel allowlist', () => {
    const events = findProjectCalendarEvents(state, {
      todayEvents: [],
      upcomingEvents: [
        { id: '1', title: 'Community lab kickoff', start: '2026-09-14', end: '2026-09-14', isAllDay: true, category: 'other', calendarId: 'primary' },
        { id: '2', title: 'Dentist', start: '2026-09-15', end: '2026-09-15', isAllDay: true, category: 'health', calendarId: 'primary' },
      ],
      fetchedAt: '2026-09-13T10:00:00.000Z',
    })

    expect(events.map(event => event.id)).toEqual(['1'])
  })
})
