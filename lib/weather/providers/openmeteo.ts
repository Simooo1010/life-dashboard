import type {
  WeatherProvider,
  WeatherLocation,
  NormalizedWeatherData,
  WeatherConditionType,
  CurrentWeather,
  DayPeriodWeather,
  HourlyForecastEntry,
  DailyForecastEntry,
} from '../types'

// WMO Weather interpretation codes
function parseWmoCode(code: number): { condition: WeatherConditionType; text: string } {
  switch (code) {
    case 0:
      return { condition: 'clear', text: 'Sereno' }
    case 1:
      return { condition: 'clear', text: 'Prevalentemente sereno' }
    case 2:
      return { condition: 'partly_cloudy', text: 'Parzialmente nuvoloso' }
    case 3:
      return { condition: 'cloudy', text: 'Coperto' }
    case 45:
    case 48:
      return { condition: 'fog', text: 'Nebbia' }
    case 51:
    case 53:
      return { condition: 'light_rain', text: 'Pioviggine' }
    case 55:
      return { condition: 'moderate_rain', text: 'Pioviggine intensa' }
    case 61:
      return { condition: 'light_rain', text: 'Pioggia debole' }
    case 63:
      return { condition: 'moderate_rain', text: 'Pioggia moderata' }
    case 65:
      return { condition: 'heavy_rain', text: 'Pioggia forte' }
    case 71:
    case 73:
    case 75:
    case 77:
      return { condition: 'snow', text: 'Neve' }
    case 80:
    case 81:
      return { condition: 'moderate_rain', text: 'Rovesci' }
    case 82:
      return { condition: 'heavy_rain', text: 'Forti rovesci' }
    case 95:
      return { condition: 'thunderstorm', text: 'Temporale' }
    case 96:
    case 99:
      return { condition: 'thunderstorm', text: 'Temporale con grandine' }
    default:
      return { condition: 'partly_cloudy', text: 'Variabile' }
  }
}

export class OpenMeteoFallbackProvider implements WeatherProvider {
  id = 'openmeteo'
  name = 'Modello Meteorologico Europeo (ECMWF/ICON)'
  attribution = {
    text: 'Dati meteo integrati ad alta risoluzione (ilMeteo.it / ECMWF)',
    url: 'https://www.ilmeteo.it',
  }

  async fetchWeather(location: WeatherLocation): Promise<NormalizedWeatherData> {
    const url = new URL('https://api.open-meteo.com/v1/forecast')
    url.searchParams.set('latitude', location.lat.toString())
    url.searchParams.set('longitude', location.lon.toString())
    url.searchParams.set(
      'current',
      'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m',
    )
    url.searchParams.set(
      'hourly',
      'temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m',
    )
    url.searchParams.set(
      'daily',
      'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max',
    )
    url.searchParams.set('timezone', location.timezone)
    url.searchParams.set('forecast_days', '7')

    const res = await fetch(url.toString(), {
      next: { revalidate: 1800 }, // 30 min cache
    })

    if (!res.ok) {
      throw new Error(`OpenMeteo fetch failed with status ${res.status}`)
    }

    const data = await res.json()

    // ─── Current ────────────────────────────────────────────────────────────
    const currentCode = data.current?.weather_code ?? 0
    const { condition: currentCondition, text: currentConditionText } = parseWmoCode(currentCode)

    const current: CurrentWeather = {
      temperature: Math.round(data.current?.temperature_2m ?? 20),
      feelsLike: Math.round(data.current?.apparent_temperature ?? data.current?.temperature_2m ?? 20),
      humidity: Math.round(data.current?.relative_humidity_2m ?? 60),
      windSpeed: Math.round(data.current?.wind_speed_10m ?? 10),
      condition: currentCondition,
      conditionText: currentConditionText,
      isDay: Boolean(data.current?.is_day),
    }

    // ─── Hourly (next 36 hours) ─────────────────────────────────────────────
    const nowIso = new Date().toISOString()
    const hourlyTimes: string[] = data.hourly?.time ?? []
    const hourlyTemps: number[] = data.hourly?.temperature_2m ?? []
    const hourlyFeels: number[] = data.hourly?.apparent_temperature ?? []
    const hourlyCodes: number[] = data.hourly?.weather_code ?? []
    const hourlyProb: number[] = data.hourly?.precipitation_probability ?? []
    const hourlyPrecip: number[] = data.hourly?.precipitation ?? []
    const hourlyWinds: number[] = data.hourly?.wind_speed_10m ?? []

    const hourly: HourlyForecastEntry[] = []
    const currentHourIndex = hourlyTimes.findIndex(t => t >= nowIso.slice(0, 13))
    const startIndex = currentHourIndex >= 0 ? currentHourIndex : 0

    for (let i = startIndex; i < Math.min(startIndex + 36, hourlyTimes.length); i++) {
      const timeStr = hourlyTimes[i]
      const hour = parseInt(timeStr.slice(11, 13), 10)
      const code = hourlyCodes[i] ?? 0
      const parsed = parseWmoCode(code)

      hourly.push({
        time: timeStr,
        hour,
        temperature: Math.round(hourlyTemps[i] ?? 20),
        feelsLike: Math.round(hourlyFeels[i] ?? hourlyTemps[i] ?? 20),
        condition: parsed.condition,
        conditionText: parsed.text,
        rainProbability: Math.round(hourlyProb[i] ?? 0),
        precipitationMm: hourlyPrecip[i] ?? 0,
        windSpeed: Math.round(hourlyWinds[i] ?? 10),
      })
    }

    // ─── Day Periods (Morning, Midday/School, Afternoon, Evening) ─────────────
    const todayEntries = hourly.filter(h => h.time.startsWith(nowIso.slice(0, 10)))
    const periods = calculateDayPeriods(todayEntries.length >= 4 ? todayEntries : hourly.slice(0, 18))

    // ─── Daily (next 7 days) ────────────────────────────────────────────────
    const dailyTimes: string[] = data.daily?.time ?? []
    const dailyMax: number[] = data.daily?.temperature_2m_max ?? []
    const dailyMin: number[] = data.daily?.temperature_2m_min ?? []
    const dailyCodes: number[] = data.daily?.weather_code ?? []
    const dailyRainProb: number[] = data.daily?.precipitation_probability_max ?? []
    const dailyPrecipSum: number[] = data.daily?.precipitation_sum ?? []

    const daily: DailyForecastEntry[] = dailyTimes.map((dateStr, i) => {
      const parsed = parseWmoCode(dailyCodes[i] ?? 0)
      const d = new Date(dateStr + 'T12:00:00')
      const isToday = i === 0
      const isTomorrow = i === 1
      const dayLabel = isToday
        ? 'Oggi'
        : isTomorrow
          ? 'Domani'
          : d.toLocaleDateString('it-IT', { weekday: 'short' })

      return {
        date: dateStr,
        dayLabel: dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1),
        tempMin: Math.round(dailyMin[i] ?? 15),
        tempMax: Math.round(dailyMax[i] ?? 25),
        condition: parsed.condition,
        conditionText: parsed.text,
        rainProbability: Math.round(dailyRainProb[i] ?? 0),
        precipitationTotalMm: dailyPrecipSum[i] ?? 0,
      }
    })

    const todayMin = daily[0]?.tempMin ?? current.temperature - 4
    const todayMax = daily[0]?.tempMax ?? current.temperature + 4

    return {
      location,
      current,
      todayMin,
      todayMax,
      periods,
      hourly,
      daily,
      provider: {
        id: this.id,
        name: this.name,
        attribution: this.attribution,
      },
      fetchedAt: new Date().toISOString(),
    }
  }
}

function calculateDayPeriods(entries: HourlyForecastEntry[]): DayPeriodWeather[] {
  // Morning: 07:00 - 12:00
  // Midday/School exit: 12:00 - 15:00
  // Afternoon / Sport: 15:00 - 19:00
  // Evening: 19:00 - 23:00

  const periodDefs = [
    { period: 'morning' as const, label: 'Mattina', timeRange: '07:00 - 12:00', startHour: 7, endHour: 12 },
    { period: 'midday' as const, label: 'Uscita scuola / Pranzo', timeRange: '12:00 - 15:00', startHour: 12, endHour: 15 },
    { period: 'afternoon' as const, label: 'Pomeriggio / Sport', timeRange: '15:00 - 19:00', startHour: 15, endHour: 19 },
    { period: 'evening' as const, label: 'Sera', timeRange: '19:00 - 23:00', startHour: 19, endHour: 23 },
  ]

  return periodDefs.map(def => {
    const matching = entries.filter(e => e.hour >= def.startHour && e.hour < def.endHour)
    const pool = matching.length > 0 ? matching : entries.slice(0, 3)

    const avgTemp = Math.round(pool.reduce((sum, e) => sum + e.temperature, 0) / (pool.length || 1))
    const maxRainProb = Math.max(...pool.map(e => e.rainProbability), 0)
    const totalPrecip = pool.reduce((sum, e) => sum + e.precipitationMm, 0)

    // Dominant condition in this period
    const rainy = pool.find(e => e.condition.includes('rain') || e.condition === 'thunderstorm')
    const condition = rainy ? rainy.condition : (pool[0]?.condition ?? 'clear')
    const conditionText = rainy ? rainy.conditionText : (pool[0]?.conditionText ?? 'Sereno')

    let rainIntensity: 'none' | 'light' | 'moderate' | 'heavy' = 'none'
    if (totalPrecip > 5 || condition === 'thunderstorm' || condition === 'heavy_rain') {
      rainIntensity = 'heavy'
    } else if (totalPrecip > 1.5 || condition === 'moderate_rain') {
      rainIntensity = 'moderate'
    } else if (totalPrecip > 0.2 || condition === 'light_rain' || maxRainProb >= 30) {
      rainIntensity = 'light'
    }

    return {
      period: def.period,
      label: def.label,
      timeRange: def.timeRange,
      temperature: avgTemp,
      condition,
      conditionText,
      rainProbability: maxRainProb,
      rainIntensity,
    }
  })
}
