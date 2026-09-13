import Groq from 'groq-sdk'
import type { NormalizedWeatherData } from '@/lib/weather/types'
import type { WeatherContextSignals } from '@/lib/weather/correlation'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// ─── Memory cache (keyed on fetchedAt, since weather itself is cached 20min) ──
let cachedSummary: string | null = null
let cachedForFetchedAt: string | null = null

export async function generateWeatherSummary(
  weather: NormalizedWeatherData,
  signals?: WeatherContextSignals,
): Promise<string | null> {
  if (!process.env.GROQ_API_KEY) return null

  if (cachedSummary && cachedForFetchedAt === weather.fetchedAt) {
    return cachedSummary
  }

  const { current, todayMin, todayMax, location, periods, daily } = weather

  const periodsText = periods
    .map(p => `${p.label} (${p.timeRange}): ${p.temperature}°C, ${p.conditionText}, probabilità pioggia ${p.rainProbability}%`)
    .join('\n')

  const dailyText = daily
    .slice(0, 5)
    .map(d => `${d.dayLabel}: min ${d.tempMin}°C / max ${d.tempMax}°C, ${d.conditionText}, pioggia ${d.rainProbability}%`)
    .join('\n')

  const alertsText = signals && signals.eventAlerts.length > 0
    ? signals.eventAlerts.map(a => `- ${a.eventTitle} (${a.timeString}): ${a.message}`).join('\n')
    : 'Nessun avviso su impegni in calendario.'

  const prompt = `Sei un assistente meteo per la dashboard personale di Simone. Devi scrivere un breve riepilogo (massimo 3 frasi, italiano, tono sobrio e diretto) della situazione meteo di oggi a ${location.name}.

REGOLA FONDAMENTALE: usa ESCLUSIVAMENTE i dati numerici e testuali forniti qui sotto. Non inventare temperature, percentuali, fenomeni o giorni non presenti nei dati. Non fare supposizioni non supportate dai numeri. Se i dati non indicano nulla di rilevante, dillo semplicemente con un tono neutro (es. "giornata stabile, nessuna variazione degna di nota").

DATI ATTUALI:
- Condizione: ${current.conditionText}, ${current.temperature}°C (percepita ${current.feelsLike}°C)
- Minima/Massima di oggi: ${todayMin}°C / ${todayMax}°C
- Umidità: ${current.humidity}% · Vento: ${current.windSpeed} km/h

FASCE ORARIE DI OGGI:
${periodsText}

PROSSIMI GIORNI:
${dailyText}

AVVISI CORRELATI AGLI IMPEGNI IN CALENDARIO:
${alertsText}

Scrivi il riepilogo in massimo 3 frasi, senza markdown, senza elenchi, senza premesse tipo "Ecco il riepilogo". Se rilevante, menziona un cambiamento significativo durante la giornata (es. arrivo di pioggia, picco di caldo) e l'andamento nei prossimi giorni, sempre basandoti solo sui dati sopra.`

  try {
    const response = await groq.chat.completions.create({
      model: 'qwen/qwen3.8-27b',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 220,
      temperature: 0.3,
      reasoning_effort: 'none',
      reasoning_format: 'hidden',
    })

    const summary = response.choices[0]?.message?.content?.trim() ?? null
    if (!summary) return null

    cachedSummary = summary
    cachedForFetchedAt = weather.fetchedAt
    return summary
  } catch (error) {
    console.error('[generateWeatherSummary]', error)
    return null
  }
}
