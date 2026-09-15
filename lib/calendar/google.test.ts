import { describe, expect, it } from 'vitest'
import { parseIcsFeed } from './google'

describe('parseIcsFeed', () => {
  it('turns HTML calendar descriptions into readable plain text', () => {
    const events = parseIcsFeed([
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'UID:work-window',
      'SUMMARY:Possibile lavoro',
      'DESCRIPTION:<p>Finestra fissata &amp; confermata.</p><p>Porta il laptop.<br>Arriva presto.</p>',
      'DTSTART:20260915T140000',
      'DTEND:20260915T150000',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n'))

    expect(events[0]?.description).toBe('Finestra fissata & confermata. Porta il laptop. Arriva presto.')
  })
})
