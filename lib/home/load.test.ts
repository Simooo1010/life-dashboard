import { describe, expect, it } from 'vitest'
import { startHomeLoads } from './load'

describe('startHomeLoads', () => {
  it('starts every independent home loader before returning', () => {
    const started: string[] = []
    const daily = Promise.resolve('daily')
    const finance = Promise.resolve('finance')
    const newsletter = Promise.resolve('newsletter')

    const loads = startHomeLoads({
      daily: () => { started.push('daily'); return daily },
      finance: () => { started.push('finance'); return finance },
      newsletter: () => { started.push('newsletter'); return newsletter },
    })

    expect(started).toEqual(['daily', 'finance', 'newsletter'])
    expect(loads).toEqual({ daily, finance, newsletter })
  })
})
