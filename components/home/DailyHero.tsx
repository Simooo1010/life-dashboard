import { RefreshCw } from 'lucide-react'

interface DailyHeroProps {
  greeting?: string
  dayOverview?: string
  energyForecast?: string
  fromCache?: boolean
  cacheAge?: number
}

export function DailyHero({ greeting, dayOverview, energyForecast, fromCache, cacheAge }: DailyHeroProps) {
  const today = new Date()
  const todayFormatted = today.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Rome',
  })

  return (
    <section className="pt-2 animate-fade-in">
      {/* Date line */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-xs text-ink-muted capitalize">{todayFormatted}</p>
        {fromCache && cacheAge !== undefined && (
          <span className="text-2xs text-ink-faint flex items-center gap-1">
            <RefreshCw size={10} />
            Cache · {cacheAge}m fa
          </span>
        )}
      </div>

      {/* Greeting */}
      {greeting ? (
        <h1 className="text-2xl md:text-3xl font-semibold text-ink leading-snug mb-3">
          {greeting}
        </h1>
      ) : (
        <h1 className="text-2xl md:text-3xl font-semibold text-ink leading-snug mb-3">
          Ciao, Simone.
        </h1>
      )}

      {/* Day overview */}
      {dayOverview && (
        <p className="text-base text-ink-muted leading-relaxed mb-4 max-w-xl">
          {dayOverview}
        </p>
      )}

      {/* Energy forecast pill */}
      {energyForecast && (
        <span className="inline-block text-xs px-3 py-1.5 bg-accent/10 text-accent rounded-full font-medium">
          {energyForecast}
        </span>
      )}
    </section>
  )
}
