// ─── Weather Types & Abstraction ──────────────────────────────────────────────

export interface WeatherLocation {
  name: string
  lat: number
  lon: number
  timezone: string
}

export type WeatherConditionType =
  | 'clear'
  | 'partly_cloudy'
  | 'cloudy'
  | 'fog'
  | 'light_rain'
  | 'moderate_rain'
  | 'heavy_rain'
  | 'thunderstorm'
  | 'snow'
  | 'windy'

export interface CurrentWeather {
  temperature: number          // °C
  feelsLike: number            // °C
  humidity: number             // %
  windSpeed: number            // km/h
  windDirection?: string
  condition: WeatherConditionType
  conditionText: string        // e.g. "Sereno", "Nubi sparse", "Pioggia debole"
  uvIndex?: number
  isDay: boolean
}

export interface DayPeriodWeather {
  period: 'morning' | 'midday' | 'afternoon' | 'evening'
  label: string                // e.g. "Mattina", "Scuola / Pranzo", "Pomeriggio", "Sera"
  timeRange: string            // e.g. "07:00 - 12:00"
  temperature: number          // representative °C
  condition: WeatherConditionType
  conditionText: string
  rainProbability: number      // 0 - 100 %
  rainIntensity: 'none' | 'light' | 'moderate' | 'heavy'
}

export interface HourlyForecastEntry {
  time: string                 // ISO string or "YYYY-MM-DDTHH:mm"
  hour: number                 // 0-23
  temperature: number
  feelsLike: number
  condition: WeatherConditionType
  conditionText: string
  rainProbability: number      // 0-100%
  precipitationMm: number      // mm
  windSpeed: number            // km/h
}

export interface DailyForecastEntry {
  date: string                 // YYYY-MM-DD
  dayLabel: string             // e.g. "Oggi", "Domani", "Lun", etc.
  tempMin: number
  tempMax: number
  condition: WeatherConditionType
  conditionText: string
  rainProbability: number
  precipitationTotalMm: number
}

export interface WeatherAttribution {
  text: string
  url: string
  logoUrl?: string
}

export interface NormalizedWeatherData {
  location: WeatherLocation
  current: CurrentWeather
  todayMin: number
  todayMax: number
  periods: DayPeriodWeather[]
  hourly: HourlyForecastEntry[]     // Next 24-48 hours
  daily: DailyForecastEntry[]       // Next 5-7 days
  alerts?: string[]
  provider: {
    id: string
    name: string
    attribution: WeatherAttribution
  }
  fetchedAt: string
}

export interface WeatherProvider {
  id: string
  name: string
  attribution: WeatherAttribution
  fetchWeather(location: WeatherLocation): Promise<NormalizedWeatherData>
}
