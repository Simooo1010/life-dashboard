import type { CalendarEvent } from '@/lib/calendar/google'
import type { NormalizedWeatherData } from './types'
import { correlateEventsWithWeatherAI } from '@/lib/groq/event-weather-correlation'

export interface EventWeatherImpact {
  eventId: string
  eventTitle: string
  timeString: string
  severity: 'info' | 'warning' | 'critical'
  message: string
}

export interface WeatherContextSignals {
  weatherRelevance: 'low' | 'medium' | 'high'
  rainRisk: 'none' | 'low' | 'moderate' | 'high'
  heatLoad: 'normal' | 'warm' | 'hot' | 'extreme'
  coldExposure: 'none' | 'mild' | 'intense'
  windDisruption: 'calm' | 'moderate' | 'strong'
  outdoorConditions: 'favorable' | 'manageable' | 'unfavorable'
  eventAlerts: EventWeatherImpact[]
  summaryForAI: string
}

export async function correlateCalendarWithWeather(
  events: CalendarEvent[],
  weather: NormalizedWeatherData,
  options: { fastMode?: boolean } = {},
): Promise<WeatherContextSignals> {
  const todayMax = weather.todayMax
  const todayMin = weather.todayMin
  const currentWind = weather.current.windSpeed

  // Heat load
  let heatLoad: WeatherContextSignals['heatLoad'] = 'normal'
  if (todayMax >= 35) heatLoad = 'extreme'
  else if (todayMax >= 30) heatLoad = 'hot'
  else if (todayMax >= 26) heatLoad = 'warm'

  // Cold exposure
  let coldExposure: WeatherContextSignals['coldExposure'] = 'none'
  if (todayMin <= 4) coldExposure = 'intense'
  else if (todayMin <= 10) coldExposure = 'mild'

  // Wind disruption
  let windDisruption: WeatherContextSignals['windDisruption'] = 'calm'
  if (currentWind >= 45) windDisruption = 'strong'
  else if (currentWind >= 25) windDisruption = 'moderate'

  // Overall rain risk across today's periods
  const maxRainProb = Math.max(...weather.periods.map(p => p.rainProbability), 0)
  let rainRisk: WeatherContextSignals['rainRisk'] = 'none'
  if (maxRainProb >= 70) rainRisk = 'high'
  else if (maxRainProb >= 40) rainRisk = 'moderate'
  else if (maxRainProb >= 20) rainRisk = 'low'

  // Correlate with today's calendar events — judged by an AI pass over each
  // event's actual title/notes/location against the real weather numbers,
  // rather than a fixed "this category always means outdoors" rule. This
  // avoids false alerts on indoor events (lessons, calls, appointments) and
  // adapts to whatever wording the event actually uses.
  const eventAlerts = options.fastMode
    ? []
    : await correlateEventsWithWeatherAI(events, weather)

  // Determine overall weather relevance
  let weatherRelevance: WeatherContextSignals['weatherRelevance'] = 'low'
  if (eventAlerts.some(a => a.severity === 'critical') || rainRisk === 'high' || heatLoad === 'extreme') {
    weatherRelevance = 'high'
  } else if (eventAlerts.length > 0 || rainRisk === 'moderate' || heatLoad === 'hot' || windDisruption === 'strong') {
    weatherRelevance = 'medium'
  }

  // Outdoor conditions summary
  let outdoorConditions: WeatherContextSignals['outdoorConditions'] = 'favorable'
  if (rainRisk === 'high' || windDisruption === 'strong' || heatLoad === 'extreme') {
    outdoorConditions = 'unfavorable'
  } else if (rainRisk === 'moderate' || heatLoad === 'hot' || windDisruption === 'moderate') {
    outdoorConditions = 'manageable'
  }

  // Compact summary for AI prompt
  const alertSnippets = eventAlerts.map(a => `[${a.eventTitle} @ ${a.timeString}: ${a.message}]`).join(' ')
  const periodSummary = weather.periods
    .map(p => `${p.label}: ${p.temperature}°C, ${p.conditionText}${p.rainProbability > 20 ? ` (pioggia ${p.rainProbability}%)` : ''}`)
    .join(' | ')

  const summaryForAI = `Meteo a ${weather.location.name}: ${weather.current.conditionText}, ${weather.current.temperature}°C (min ${todayMin}°C / max ${todayMax}°C). Rilevanza: ${weatherRelevance}. ${periodSummary}. ${alertSnippets ? `Avvisi impegni: ${alertSnippets}` : 'Nessuna interferenza critica con gli impegni.'}`

  return {
    weatherRelevance,
    rainRisk,
    heatLoad,
    coldExposure,
    windDisruption,
    outdoorConditions,
    eventAlerts,
    summaryForAI,
  }
}
