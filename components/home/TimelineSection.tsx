import type { CalendarEvent } from '@/lib/calendar/google'
import { formatTime } from '@/lib/utils'
import { CategoryBadge } from '@/components/common/Badge'
import { Clock, MapPin } from 'lucide-react'

interface TimelineSectionProps {
  todayEvents: CalendarEvent[]
}

export function TimelineSection({ todayEvents }: TimelineSectionProps) {
  if (todayEvents.length === 0) {
    return (
      <section>
        <p className="section-label mb-3">Oggi</p>
        <div className="card text-center py-8">
          <p className="text-sm text-ink-faint">Nessun evento in programma per oggi.</p>
          <p className="text-xs text-ink-faint mt-1">Spazio libero per concentrarsi o riposare.</p>
        </div>
      </section>
    )
  }

  const sortedEvents = [...todayEvents].sort((a, b) => {
    const aKey = a.isAllDay ? '00:00' : a.start
    const bKey = b.isAllDay ? '00:00' : b.start
    return aKey.localeCompare(bKey)
  })

  return (
    <section>
      <p className="section-label mb-3">
        Oggi · {sortedEvents.length} {sortedEvents.length === 1 ? 'evento' : 'eventi'}
      </p>
      <div className="card divide-y divide-border -my-px">
        {sortedEvents.map((event) => {
          const timeLabel = event.isAllDay ? 'Tutto il giorno' : formatTime(event.start)
          return (
            <div key={event.id} className="flex items-start gap-4 py-3.5 first:pt-0 last:pb-0">
              {/* Time column */}
              <div className="w-24 shrink-0 text-right">
                <span className="text-xs text-ink-faint font-mono">{timeLabel}</span>
              </div>

              {/* Icon */}
              <div className="shrink-0 mt-0.5">
                <Clock size={14} className="text-ink-faint" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink line-clamp-1">{event.title}</p>
                {event.location && (
                  <p className="text-xs text-ink-muted mt-0.5 flex items-center gap-1">
                    <MapPin size={11} className="shrink-0" />
                    <span className="truncate">{event.location}</span>
                  </p>
                )}
                {event.description && (
                  <p className="text-xs text-ink-muted/80 mt-1 line-clamp-2">
                    {event.description}
                  </p>
                )}
              </div>

              {/* Category badge */}
              <CategoryBadge category={event.category} size="xs" className="shrink-0 mt-0.5" />
            </div>
          )
        })}
      </div>
    </section>
  )
}
