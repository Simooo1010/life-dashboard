import type { CalendarEvent } from '@/lib/calendar/google'
import type { NormalizedWeatherData, HourlyForecastEntry } from './types'

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

function parseHourFromIso(isoString: string): number | null {
  if (!isoString.includes('T')) return null
  const timePart = isoString.split('T')[1]
  if (!timePart) return null
  return parseInt(timePart.slice(0, 2), 10)
}

export function correlateCalendarWithWeather(
  events: CalendarEvent[],
  weather: NormalizedWeatherData,
): WeatherContextSignals {
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

  // Correlate with today's calendar events
  const eventAlerts: EventWeatherImpact[] = []

  for (const event of events) {
    if (event.isAllDay) continue
    const startHour = parseHourFromIso(event.start)
    if (startHour === null) continue

    // Find matching hourly forecasts (startHour and startHour + 1)
    const matchingHourly = weather.hourly.filter(h => h.hour >= startHour && h.hour <= startHour + 2)
    if (matchingHourly.length === 0) continue

    const peakRainProb = Math.max(...matchingHourly.map(h => h.rainProbability), 0)
    const peakTemp = Math.max(...matchingHourly.map(h => h.temperature), 0)
    const rainCondition = matchingHourly.find(h => h.condition.includes('rain') || h.condition === 'thunderstorm')

    // Scenario 1: Rain overlapping with event / travel
    if (peakRainProb >= 45 || rainCondition) {
      const isThunderstorm = rainCondition?.condition === 'thunderstorm'
      eventAlerts.push({
        eventId: event.id,
        eventTitle: event.title,
        timeString: `${startHour}:00`,
        severity: isThunderstorm || peakRainProb >= 70 ? 'critical' : 'warning',
        message: isThunderstorm
          ? `Temporale o forti precipitazioni previste in concomitanza (${startHour}:00). Tragitto da proteggere.`
          : `Rischio pioggia significativo (${peakRainProb}%) attorno alle ${startHour}:00. Attenzione a spostamenti o attività all'aperto.`,
      })
    }

    // Scenario 2: Heat peak during sport / training
    if (event.category === 'sport' && peakTemp >= 29) {
      eventAlerts.push({
        eventId: event.id,
        eventTitle: event.title,
        timeString: `${startHour}:00`,
        severity: peakTemp >= 33 ? 'warning' : 'info',
        message: `Temperatura elevata (~${peakTemp}°C) nelle ore dell'attività sportiva. Idratazione e gestione energetica prioritarie.`,
      })
    }
  }

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
