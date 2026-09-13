import type { NewsletterProjectState } from './types'

export interface NewsletterPulseSignal {
  label: string
  value: string
  tone: 'focus' | 'change' | 'blocker' | 'question' | 'phase'
}

export function getNewsletterPulseSignals(state: NewsletterProjectState): NewsletterPulseSignal[] {
  const signals: Array<NewsletterPulseSignal | null> = [
    state.pulse.currentFocus ? { label: 'Focus', value: state.pulse.currentFocus, tone: 'focus' } : null,
    state.pulse.latestMeaningfulChange ? { label: 'Ultimo cambio', value: state.pulse.latestMeaningfulChange, tone: 'change' } : null,
    state.blockers[0] ? { label: 'Blocco', value: state.blockers[0].title, tone: 'blocker' } : null,
    state.openQuestions[0] ? { label: 'Questione aperta', value: state.openQuestions[0].title, tone: 'question' } : null,
    state.pulse.phase ? { label: 'Fase', value: state.pulse.phase, tone: 'phase' } : null,
  ]
  return signals.filter((signal): signal is NewsletterPulseSignal => signal !== null).slice(0, 3)
}
