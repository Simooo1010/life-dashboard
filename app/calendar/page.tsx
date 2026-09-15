import { AppShell } from '@/components/layout/AppShell'
import type { CalendarData, CalendarEvent } from '@/lib/calendar/google'
import { loadCachedCalendar } from '@/lib/cache/dashboard-data'
import { formatTime, formatDate } from '@/lib/utils'
import { CategoryBadge } from '@/components/common/Badge'

export const dynamic = 'force-dynamic'

export default async function CalendarPage() {
  let data: CalendarData | null = null
  try {
    data = await loadCachedCalendar()
  } catch (e) {
    console.error('[CalendarPage]', e)
  }

  const todayStr = new Date().toISOString().split('T')[0]

  // Group upcoming events by date
  const byDate = new Map<string, CalendarEvent[]>()
  if (data) {
    for (const event of data.upcomingEvents) {
      const day = event.isAllDay ? event.start : event.start.split('T')[0]
      if (!byDate.has(day)) byDate.set(day, [])
      byDate.get(day)!.push(event)
    }
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-8 space-y-8">
        <h1 className="text-xl font-semibold text-ink">Calendario</h1>

        {/* Today */}
        <section>
          <p className="section-label mb-3">Oggi</p>
          {data?.todayEvents.length === 0 ? (
            <div className="card text-center py-6">
              <p className="text-sm text-ink-faint">Nessun evento per oggi.</p>
            </div>
          ) : (
            <div className="card divide-y divide-border -my-px">
              {data?.todayEvents.map(event => (
                <div key={event.id} className="py-3.5 flex items-start gap-4 first:pt-0 last:pb-0">
                  <div className="w-20 shrink-0 text-right">
                    <span className="text-xs font-mono text-ink-faint">
                      {event.isAllDay ? 'Tutto il giorno' : formatTime(event.start)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-ink">{event.title}</p>
                    {event.location && <p className="text-xs text-ink-muted">{event.location}</p>}
                  </div>
                  <CategoryBadge category={event.category} size="xs" className="shrink-0" />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Upcoming */}
        {data && byDate.size > 0 && (
          <section>
            <p className="section-label mb-3">Prossimi 7 giorni</p>
            <div className="space-y-4">
              {Array.from(byDate.entries()).map(([date, events]) => (
                <div key={date}>
                  <p className="text-xs font-medium text-ink-muted capitalize mb-2">
                    {formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                  <div className="card divide-y divide-border -my-px">
                    {events.map(event => (
                      <div key={event.id} className="py-3 flex items-start gap-4 first:pt-0 last:pb-0">
                        <div className="w-20 shrink-0 text-right">
                          <span className="text-xs font-mono text-ink-faint">
                            {event.isAllDay ? '—' : formatTime(event.start)}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-ink">{event.title}</p>
                          {event.location && <p className="text-xs text-ink-muted">{event.location}</p>}
                        </div>
                        <CategoryBadge category={event.category} size="xs" className="shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {!data && (
          <div className="card text-center py-8">
            <p className="text-sm text-red-600 dark:text-red-400">Calendario non disponibile.</p>
            <p className="text-xs text-ink-faint mt-1">Controlla la configurazione Google Calendar.</p>
          </div>
        )}
      </div>
    </AppShell>
  )
}
