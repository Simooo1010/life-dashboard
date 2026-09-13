import type { WeatherLocation } from './types'

// ─── Default Location: Modica (Sicilia, Italia) ───────────────────────────────
export const DEFAULT_WEATHER_LOCATION: WeatherLocation = {
  name: 'Modica',
  lat: 36.8588,
  lon: 14.7608,
  timezone: 'Europe/Rome',
}

export function getConfiguredWeatherLocation(): WeatherLocation {
  const name = process.env.WEATHER_LOCATION_NAME || DEFAULT_WEATHER_LOCATION.name
  const lat = process.env.WEATHER_LAT ? parseFloat(process.env.WEATHER_LAT) : DEFAULT_WEATHER_LOCATION.lat
  const lon = process.env.WEATHER_LON ? parseFloat(process.env.WEATHER_LON) : DEFAULT_WEATHER_LOCATION.lon
  const timezone = process.env.WEATHER_TIMEZONE || DEFAULT_WEATHER_LOCATION.timezone

  return { name, lat, lon, timezone }
}
