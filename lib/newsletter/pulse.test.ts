import { describe, expect, it } from 'vitest'
import { getNewsletterPulseSignals } from './pulse'
import type { NewsletterProjectState } from './types'

it('keeps Home to three high-signal source-derived items', () => {
  const state = {
    pulse: { currentFocus: 'Define premium boundary', latestMeaningfulChange: 'Website moved earlier', phase: 'Foundation' },
    blockers: [{ title: 'Capacity', evidenceBlockIds: ['b'] }],
    openQuestions: [{ title: 'Pricing?', evidenceBlockIds: ['q'] }],
  } as NewsletterProjectState

  expect(getNewsletterPulseSignals(state)).toEqual([
    { label: 'Focus', value: 'Define premium boundary', tone: 'focus' },
    { label: 'Ultimo cambio', value: 'Website moved earlier', tone: 'change' },
    { label: 'Blocco', value: 'Capacity', tone: 'blocker' },
  ])
})
