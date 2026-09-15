import Groq from 'groq-sdk'
import type { CalendarEvent } from '@/lib/calendar/google'
import type { NormalizedWeatherData } from '@/lib/weather/types'
import type { EventWeatherImpact } from '@/lib/weather/correlation'
import { getLocalHour } from '@/lib/utils'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// event.start is UTC; weather.hourly is indexed by local (Europe/Rome) hour,
// so this must convert rather than read the raw UTC hour off the string —
// a raw read was off by the timezone offset (e.g. 11:30 showing as 9:30).
function parseHourFromIso(isoString: string): number | null {
  return getLocalHour(isoString)
}

// ─── AI-driven event ↔ weather correlation ─────────────────────────────────────
// Instead of hardcoding "this category = outdoor" or "any rain% above X = alert",
// we hand the model the actual event text (title, notes, location) alongside the
// actual weather numbers for that time slot, and ask it to judge — from the
// content of the event — whether it plausibly involves being outdoors or in
// transit, and only then whether the weather at that time matters for it.
export async function correlateEventsWithWeatherAI(
  events: CalendarEvent[],
  weather: NormalizedWeatherData,
): Promise<EventWeatherImpact[]> {
  const timedEvents = events.filter(e => !e.isAllDay && parseHourFromIso(e.start) !== null)
  if (timedEvents.length === 0) return []
  if (!process.env.GROQ_API_KEY) return []

  // Cheap pre-filter: skip the AI call entirely if today's weather has no
  // meaningful signal at all (avoids wasted calls, not a correlation shortcut).
  const maxRainProb = Math.max(...weather.periods.map(p => p.rainProbability), 0)
  const hasSignal =
    maxRainProb >= 20 ||
    weather.todayMax >= 28 ||
    weather.todayMin <= 8 ||
    weather.current.windSpeed >= 25 ||
    weather.periods.some(p => p.condition === 'thunderstorm' || p.condition.includes('rain'))
  if (!hasSignal) return []

  const eventsPayload = timedEvents.map(e => {
    const startHour = parseHourFromIso(e.start)!
    const matchingHourly = weather.hourly.filter(h => h.hour >= startHour && h.hour <= startHour + 2)
    return {
      id: e.id,
      title: e.title,
      notes: e.description ?? '',
      location: e.location ?? '',
      category: e.category,
      startHour,
      weatherAtThatTime: matchingHourly.map(h => ({
        hour: h.hour,
        temperature: h.temperature,
        condition: h.conditionText,
        rainProbability: h.rainProbability,
        windSpeed: h.windSpeed,
      })),
    }
  })

  const prompt = `Sei un assistente che valuta se il meteo influisce concretamente sugli impegni di oggi di Simone.

Per ciascun evento qui sotto, decidi PRIMA se l'evento comporta plausibilmente uno spostamento o un'esposizione all'aperto (es. tragitto a piedi/bici, allenamento sportivo, attività all'aperto, uscita). Usa il titolo, le note e il luogo per giudicarlo. Eventi come lezioni, verifiche, videochiamate, riunioni online, visite in studio, o qualunque cosa chiaramente al chiuso NON comportano esposizione al meteo, anche se il meteo è brutto: NON includerli.

Solo per gli eventi che comportano davvero spostamento o esposizione, valuta se il meteo nell'orario indicato (vedi dati orari forniti) rappresenta un rischio pratico (pioggia, temporale, caldo intenso, vento forte, freddo). Se il meteo in quell'orario è ininfluente, non includere l'evento.

EVENTI DI OGGI CON METEO ASSOCIATO:
${JSON.stringify(eventsPayload, null, 2)}

Rispondi SOLO con un JSON di questa forma esatta, senza altro testo:
{
  "alerts": [
    {
      "eventId": "id esatto dell'evento",
      "severity": "info" | "warning" | "critical",
      "message": "una frase breve, pratica, in italiano, basata SOLO sui numeri meteo forniti per quell'orario, senza inventare dati"
    }
  ]
}

Se nessun evento è realmente influenzato dal meteo, rispondi con {"alerts": []}. Non forzare un risultato: è normale che la lista sia vuota.`

  try {
    const response = await groq.chat.completions.create({
      model: 'qwen/qwen3.8-27b',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 700,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      reasoning_effort: 'none',
      reasoning_format: 'hidden',
    })

    const raw = response.choices[0]?.message?.content ?? '{"alerts":[]}'
    const parsed = JSON.parse(raw) as { alerts?: Array<{ eventId: string; severity: string; message: string }> }
    const alerts = parsed.alerts ?? []

    const validEventIds = new Set(timedEvents.map(e => e.id))
    const validSeverities = new Set(['info', 'warning', 'critical'])

    return alerts
      .filter(a => validEventIds.has(a.eventId) && validSeverities.has(a.severity) && a.message)
      .map(a => {
        const event = timedEvents.find(e => e.id === a.eventId)!
        const startHour = parseHourFromIso(event.start)!
        return {
          eventId: a.eventId,
          eventTitle: event.title,
          timeString: `${startHour}:00`,
          severity: a.severity as EventWeatherImpact['severity'],
          message: a.message,
        }
      })
  } catch (error) {
    console.error('[correlateEventsWithWeatherAI]', error)
    return []
  }
}
