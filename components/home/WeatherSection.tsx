import type { NormalizedWeatherData } from '@/lib/weather/types'
import type { WeatherContextSignals } from '@/lib/weather/correlation'
import Link from 'next/link'
import {
  Sun,
  Cloud,
  CloudSun,
  CloudRain,
  CloudLightning,
  CloudSnow,
  CloudFog,
  Wind,
  Droplets,
  AlertTriangle,
  Info,
  ExternalLink,
} from 'lucide-react'

interface WeatherSectionProps {
  weather: NormalizedWeatherData | null
  weatherSignals?: WeatherContextSignals | null
  weatherNote?: string
}

function getWeatherIcon(condition: string, size = 16, className = '') {
  switch (condition) {
    case 'clear':
      return <Sun size={size} className={`text-amber-500 dark:text-amber-400 ${className}`} />
    case 'partly_cloudy':
      return <CloudSun size={size} className={`text-amber-600/80 dark:text-amber-400/80 ${className}`} />
    case 'cloudy':
      return <Cloud size={size} className={`text-ink-muted ${className}`} />
    case 'fog':
      return <CloudFog size={size} className={`text-ink-faint ${className}`} />
    case 'light_rain':
    case 'moderate_rain':
    case 'heavy_rain':
      return <CloudRain size={size} className={`text-blue-500 dark:text-blue-400 ${className}`} />
    case 'thunderstorm':
      return <CloudLightning size={size} className={`text-purple-600 dark:text-purple-400 ${className}`} />
    case 'snow':
      return <CloudSnow size={size} className={`text-blue-300 ${className}`} />
    default:
      return <CloudSun size={size} className={`text-amber-600 dark:text-amber-400 ${className}`} />
  }
}

export function WeatherSection({ weather, weatherSignals, weatherNote }: WeatherSectionProps) {
  if (!weather) {
    return (
      <section>
        <p className="section-label mb-3">Condizioni Esterne</p>
        <div className="card text-center py-5">
          <p className="text-xs text-ink-faint">Dati meteo temporaneamente non disponibili.</p>
        </div>
      </section>
    )
  }

  const { current, periods, todayMin, todayMax, location, provider } = weather
  const activeAlerts = weatherSignals?.eventAlerts ?? []

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="section-label">Meteo · {location.name}</p>
        <Link
          href="/weather"
          prefetch={false}
          className="text-xs text-ink-muted hover:text-accent transition-colors flex items-center gap-1"
        >
          Previsioni complete →
        </Link>
      </div>

      <div className="card space-y-4">
        {/* ─── Current snapshot ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-border pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-surface/90 border border-border/80 flex items-center justify-center">
              {getWeatherIcon(current.condition, 22)}
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-ink tabular-nums">
                  {current.temperature}°
                </span>
                <span className="text-xs text-ink-muted font-medium">
                  {current.conditionText}
                </span>
              </div>
              <p className="text-2xs text-ink-faint">
                Percepita {current.feelsLike}° · Min {todayMin}° / Max {todayMax}°
              </p>
            </div>
          </div>

          <div className="text-right hidden sm:block">
            <div className="flex items-center justify-end gap-3 text-2xs text-ink-muted">
              <span className="inline-flex items-center gap-1">
                <Droplets size={11} className="text-blue-500 dark:text-blue-400" />
                {current.humidity}%
              </span>
              <span className="inline-flex items-center gap-1">
                <Wind size={11} className="text-ink-faint" />
                {current.windSpeed} km/h
              </span>
            </div>
          </div>
        </div>

        {/* ─── 4-Period Day Progression ───────────────────────────────────── */}
        <div>
          <p className="text-2xs uppercase tracking-wider text-ink-faint font-medium mb-2.5">
            Evoluzione della giornata
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {periods.map(period => (
              <div
                key={period.period}
                className="bg-surface/50 border border-border/60 rounded-lg p-2.5 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xs font-medium text-ink-muted truncate">
                    {period.label}
                  </span>
                  {getWeatherIcon(period.condition, 14)}
                </div>

                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold text-ink tabular-nums">
                    {period.temperature}°
                  </span>
                  {period.rainProbability > 15 && (
                    <span
                      className={`text-2xs font-medium px-1.5 py-0.5 rounded ${
                        period.rainProbability >= 60
                          ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300'
                          : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                      }`}
                    >
                      {period.rainProbability}%
                    </span>
                  )}
                </div>

                <p className="text-2xs text-ink-faint truncate">{period.conditionText}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Calendar Correlation Alerts (if any) ───────────────────────── */}
        {activeAlerts.length > 0 && (
          <div className="space-y-1.5 pt-1">
            {activeAlerts.map((alert, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs leading-relaxed ${
                  alert.severity === 'critical'
                    ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200/80 dark:border-rose-900/50 text-rose-900 dark:text-rose-300'
                    : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200/80 dark:border-amber-900/50 text-amber-900 dark:text-amber-300'
                }`}
              >
                {alert.severity === 'critical' ? (
                  <AlertTriangle size={14} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                ) : (
                  <Info size={14} className="text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <span className="font-semibold">{alert.eventTitle}: </span>
                  <span>{alert.message}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── AI Contextual Weather Note ─────────────────────────────────── */}
        {weatherNote && activeAlerts.length === 0 && (
          <p className="text-xs text-ink-muted leading-relaxed bg-surface/60 border border-border/60 rounded-lg p-2.5">
            {weatherNote}
          </p>
        )}

        {/* ─── Attribution footer ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between text-2xs text-ink-faint pt-1 border-t border-border/50">
          <a
            href={provider.attribution.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline hover:text-ink-muted inline-flex items-center gap-1 transition-colors"
          >
            {provider.attribution.text} <ExternalLink size={9} />
          </a>
          <span>Aggiornato pochi min fa</span>
        </div>
      </div>
    </section>
  )
}
