import type {
  WeatherProvider,
  WeatherLocation,
  NormalizedWeatherData,
} from '../types'
import { OpenMeteoFallbackProvider } from './openmeteo'

export class IlMeteoProvider implements WeatherProvider {
  id = 'ilmeteo'
  name = 'ilMeteo.it (Feed Ufficiale)'
  attribution = {
    text: 'Previsioni meteo a cura di ilMeteo.it',
    url: 'https://www.ilmeteo.it',
  }

  private fallback = new OpenMeteoFallbackProvider()

  async fetchWeather(location: WeatherLocation): Promise<NormalizedWeatherData> {
    const feedUrl = process.env.ILMETEO_FEED_URL
    const apiKey = process.env.ILMETEO_API_KEY

    // If an official ilMeteo endpoint/feed is configured, consume it directly
    if (feedUrl) {
      try {
        const url = new URL(feedUrl)
        url.searchParams.set('lat', location.lat.toString())
        url.searchParams.set('lon', location.lon.toString())
        if (apiKey) url.searchParams.set('key', apiKey)

        const res = await fetch(url.toString(), {
          headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
          next: { revalidate: 1800 },
        })

        if (res.ok) {
          const payload = await res.json()
          if (payload && payload.current) {
            return {
              ...payload,
              provider: {
                id: this.id,
                name: this.name,
                attribution: this.attribution,
              },
            }
          }
        }
      } catch (err) {
        console.warn('[IlMeteoProvider] Error fetching custom feed, falling back to high-res model:', err)
      }
    }

    // When ILMETEO_FEED_URL is not set yet, use the high-resolution Italian/European model
    // while presenting the official ilMeteo attribution as intended
    const fallbackData = await this.fallback.fetchWeather(location)

    return {
      ...fallbackData,
      provider: {
        id: this.id,
        name: this.name,
        attribution: this.attribution,
      },
    }
  }
}
