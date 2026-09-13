import type { WeatherProvider, NormalizedWeatherData, WeatherLocation } from './types'
import { IlMeteoProvider } from './providers/ilmeteo'
import { OpenMeteoFallbackProvider } from './providers/openmeteo'
import { getConfiguredWeatherLocation } from './config'

// ─── Provider Factory ─────────────────────────────────────────────────────────
export function getWeatherProvider(): WeatherProvider {
  const providerKey = (process.env.WEATHER_PROVIDER || 'ilmeteo').toLowerCase()

  switch (providerKey) {
    case 'openmeteo':
      return new OpenMeteoFallbackProvider()
    case 'ilmeteo':
    default:
      return new IlMeteoProvider()
  }
}

// ─── Memory cache (20 minutes TTL) ────────────────────────────────────────────
let cachedData: NormalizedWeatherData | null = null
let cacheExpiresAt = 0

export async function fetchWeatherData(customLocation?: WeatherLocation): Promise<NormalizedWeatherData> {
  const location = customLocation || getConfiguredWeatherLocation()
  const now = Date.now()

  // Return cached result if fresh and same location
  if (
    cachedData &&
    now < cacheExpiresAt &&
    cachedData.location.name === location.name &&
    Math.abs(cachedData.location.lat - location.lat) < 0.01 &&
    Math.abs(cachedData.location.lon - location.lon) < 0.01
  ) {
    return cachedData
  }

  const provider = getWeatherProvider()
  const fresh = await provider.fetchWeather(location)

  cachedData = fresh
  cacheExpiresAt = now + 20 * 60 * 1000 // 20 minutes

  return fresh
}
