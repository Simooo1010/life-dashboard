import type { DailyPriority } from '@/lib/groq/synthesis'
import { UrgencyBadge, CategoryBadge } from '@/components/common/Badge'
import { Sparkles } from 'lucide-react'

interface PrioritiesSectionProps {
  priorities: DailyPriority[]
}

export function PrioritiesSection({ priorities }: PrioritiesSectionProps) {
  if (priorities.length === 0) return null

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <p className="section-label">Priorità del giorno</p>
        <Sparkles size={12} className="text-accent" />
      </div>

      <div className="space-y-2.5">
        {priorities.map((priority, i) => (
          <div
            key={i}
            className="card flex items-start gap-4"
          >
            {/* Rank number */}
            <span className="text-lg font-light text-ink-faint tabular-nums mt-0.5 w-5 shrink-0 text-right">
              {i + 1}
            </span>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink">{priority.title}</p>
              <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">{priority.context}</p>
            </div>

            {/* Badges */}
            <div className="flex flex-col items-end gap-1 shrink-0">
              <UrgencyBadge urgency={priority.urgency} />
              <CategoryBadge category={priority.source as any} size="xs" />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
