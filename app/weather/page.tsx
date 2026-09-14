import { AppShell } from '@/components/layout/AppShell'
import { fetchWeatherData } from '@/lib/weather/client'
import { fetchCalendarData } from '@/lib/calendar/google'
import { correlateCalendarWithWeather } from '@/lib/weather/correlation'
import { generateWeatherSummary } from '@/lib/groq/weather-summary'
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
  Sparkles,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

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

export default async function WeatherPage() {
  let weather = null
  let signals = null
  let aiSummary: string | null = null

  try {
    const [weatherRes, calendarRes] = await Promise.allSettled([
      fetchWeatherData(),
      fetchCalendarData(),
    ])

    if (weatherRes.status === 'fulfilled') {
      weather = weatherRes.value
      const events = calendarRes.status === 'fulfilled' ? calendarRes.value.todayEvents : []
      signals = await correlateCalendarWithWeather(events, weather)
      aiSummary = await generateWeatherSummary(weather, signals)
    }
  } catch (error) {
    console.error('[WeatherPage]', error)
  }

  if (!weather) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto px-4 md:px-8 py-8">
          <h1 className="text-xl font-semibold text-ink mb-4">Meteo</h1>
          <div className="card text-center py-8">
            <p className="text-sm text-red-600 dark:text-red-400">Dati meteo non disponibili al momento.</p>
            <p className="text-xs text-ink-faint mt-1">Verifica la connessione di rete.</p>
          </div>
        </div>
      </AppShell>
    )
  }

  const { current, todayMin, todayMax, location, periods, hourly, daily, provider } = weather

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-8 space-y-8">
        {/* ─── Header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-ink">Meteo · {location.name}</h1>
            <p className="text-xs text-ink-muted mt-0.5">
              Condizioni attuali e impatto sulla giornata
            </p>
          </div>
          <a
            href={provider.attribution.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-2xs text-ink-faint hover:text-ink-muted inline-flex items-center gap-1 transition-colors"
          >
            {provider.attribution.text} <ExternalLink size={10} />
          </a>
        </div>

        {/* ─── AI Summary ─────────────────────────────────────────── */}
        {aiSummary && (
          <div className="card bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/40 flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
              <Sparkles size={15} className="text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-sm text-ink leading-relaxed">{aiSummary}</p>
          </div>
        )}

        {/* ─── Hero Overview Card ─────────────────────────────────── */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-surface border border-border/80 flex items-center justify-center">
                {getWeatherIcon(current.condition, 32)}
              </div>
              <div>
                <div className="flex items-baseline gap-2.5">
                  <span className="text-4xl font-bold text-ink tabular-nums">
                    {current.temperature}°
                  </span>
                  <span className="text-sm font-medium text-ink-muted">
                    {current.conditionText}
                  </span>
                </div>
                <p className="text-xs text-ink-faint mt-0.5">
                  Percepita {current.feelsLike}° · Minima {todayMin}° / Massima {todayMax}°
                </p>
              </div>
            </div>

            <div className="space-y-1 text-right text-xs text-ink-muted">
              <p className="flex items-center justify-end gap-1.5">
                <Droplets size={13} className="text-blue-500 dark:text-blue-400" />
                <span>Umidità {current.humidity}%</span>
              </p>
              <p className="flex items-center justify-end gap-1.5">
                <Wind size={13} className="text-ink-faint" />
                <span>Vento {current.windSpeed} km/h</span>
              </p>
            </div>
          </div>

          {/* Contextual Calendar Alerts */}
          {signals && signals.eventAlerts.length > 0 && (
            <div className="pt-2 border-t border-border space-y-2">
              <p className="text-2xs uppercase tracking-wider font-semibold text-ink-muted">
                Correlazione con i tuoi impegni
              </p>
              {signals.eventAlerts.map((alert, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                    alert.severity === 'critical'
                      ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 text-rose-900 dark:text-rose-300'
                      : 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-300'
                  }`}
                >
                  {alert.severity === 'critical' ? (
                    <AlertTriangle size={15} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  ) : (
                    <Info size={15} className="text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-semibold">{alert.eventTitle} ({alert.timeString}): </span>
                    <span>{alert.message}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── Day Periods ────────────────────────────────────────── */}
        <section className="space-y-3">
          <p className="section-label">Fasi del Giorno</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {periods.map(period => (
              <div key={period.period} className="card p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink">{period.label}</span>
                  {getWeatherIcon(period.condition, 16)}
                </div>
                <p className="text-2xs text-ink-faint font-mono">{period.timeRange}</p>
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-xl font-bold text-ink tabular-nums">
                    {period.temperature}°
                  </span>
                  {period.rainProbability > 10 && (
                    <span className="text-2xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded">
                      {period.rainProbability}% pioggia
                    </span>
                  )}
                </div>
                <p className="text-2xs text-ink-muted truncate">{period.conditionText}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Hourly Forecast (Next 24h) ─────────────────────────── */}
        <section className="space-y-3">
          <p className="section-label">Previsioni Orarie</p>
          <div className="card p-0 overflow-hidden">
            <div className="flex divide-x divide-border overflow-x-auto py-4 px-2 scrollbar-thin">
              {hourly.slice(0, 20).map(entry => (
                <div
                  key={entry.time}
                  className="flex flex-col items-center px-3.5 shrink-0 min-w-[62px] space-y-2"
                >
                  <span className="text-2xs font-mono text-ink-faint">
                    {entry.hour.toString().padStart(2, '0')}:00
                  </span>
                  {getWeatherIcon(entry.condition, 18)}
                  <span className="text-sm font-semibold text-ink tabular-nums">
                    {entry.temperature}°
                  </span>
                  <span
                    className={`text-2xs tabular-nums font-medium ${
                      entry.rainProbability >= 40 ? 'text-blue-600 dark:text-blue-400' : 'text-ink-faint'
                    }`}
                  >
                    {entry.rainProbability > 0 ? `${entry.rainProbability}%` : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── 7-Day Forecast ─────────────────────────────────────── */}
        <section className="space-y-3">
          <p className="section-label">Prossimi 7 Giorni</p>
          <div className="card divide-y divide-border -my-px">
            {daily.map(day => (
              <div
                key={day.date}
                className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0 gap-3"
              >
                <div className="w-20 shrink-0">
                  <p className="text-sm font-medium text-ink">{day.dayLabel}</p>
                  <p className="text-2xs text-ink-faint">{day.date.slice(5)}</p>
                </div>

                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {getWeatherIcon(day.condition, 16)}
                  <span className="text-xs text-ink-muted truncate">{day.conditionText}</span>
                </div>

                {day.rainProbability > 20 && (
                  <span className="text-2xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded shrink-0">
                    {day.rainProbability}%
                  </span>
                )}

                <div className="text-right shrink-0 w-20 font-mono text-xs tabular-nums">
                  <span className="text-ink-faint">{day.tempMin}°</span>
                  <span className="text-ink-faint mx-1">/</span>
                  <span className="text-ink font-semibold">{day.tempMax}°</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  )
}
