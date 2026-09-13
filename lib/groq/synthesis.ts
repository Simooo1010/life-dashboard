import Groq from 'groq-sdk'
import type { ChatCompletionCreateParamsNonStreaming } from 'groq-sdk/resources/chat/completions'
import { createHash } from 'crypto'
import type { SecondBrainData } from '@/lib/notion/second-brain'
import type { CalendarData } from '@/lib/calendar/google'
import type { WeatherContextSignals } from '@/lib/weather/correlation'
import type { DailyContext } from '@/lib/daily-context/types'
import type { SecondBrainResult } from '@/lib/second-brain/types'

function getGroq() { return new Groq({ apiKey: process.env.GROQ_API_KEY ?? '' }) }

type GroqReasoningRequest = ChatCompletionCreateParamsNonStreaming & {
  reasoning_effort: 'none' | 'low'
  reasoning_format: 'hidden'
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface DailyPriority {
  title: string
  context: string       // one-sentence explanation
  source: string        // 'school' | 'sport' | 'personal' | 'newsletter'
  urgency: 'high' | 'medium' | 'low'
}

export interface DailySynthesis {
  date: string           // YYYY-MM-DD
  greeting: string       // warm, personal, 1–2 sentences
  dayOverview: string    // 2–3 sentences summarizing the day
  priorities: DailyPriority[]
  secondBrainInsight: string   // one insight from recent KB activity
  energyForecast: string       // very short: "heavy cognitive day" etc.
  newsletterNote: string       // brief note about newsletter work if relevant
  weatherNote?: string         // practical contextual impact of weather, if relevant
  inputHash: string
  generatedAt: string
}

export interface AllSourceData {
  calendar: CalendarData
  secondBrain: SecondBrainData
  weather?: WeatherContextSignals
  date: string
  dailyContext?: DailyContext
  contextualSecondBrain?: SecondBrainResult
}

// ─── Hash computation ─────────────────────────────────────────────────────────
export function computeInputHash(data: AllSourceData): string {
  const payload = JSON.stringify({
    date: data.date,
    events: data.calendar.todayEvents.map(e => `${e.title}|${e.start}|${e.category}`).sort(),
    upcomingEvents: data.calendar.upcomingEvents.map(e => `${e.title}|${e.start}`).slice(0, 10).sort(),
    recentConcepts: data.secondBrain.recentConcepts.map(c => c.concept).slice(0, 10).sort(),
    unprocessedCount: data.secondBrain.unprocessedSources.length,
    weatherSummary: data.weather?.summaryForAI ?? '',
    contextHash: data.dailyContext?.contextHash ?? '',
    recommendationIds: data.contextualSecondBrain?.relevantToday.map(item => item.id) ?? [],
  })
  return createHash('sha256').update(payload).digest('hex')
}

// ─── Synthesis generator ──────────────────────────────────────────────────────
export async function generateDailySynthesis(data: AllSourceData): Promise<DailySynthesis> {
  const groq = getGroq()
  const inputHash = computeInputHash(data)
  const todayFormatted = new Date(data.date + 'T12:00:00').toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  // Stage 1: Extract key facts
  const factsPrompt = `Sei un assistente personale per la dashboard di Simone (19 anni, quinto anno di liceo scientifico).
Hai a disposizione i seguenti dati per oggi, ${todayFormatted}:

EVENTI CALENDARIO OGGI: ${JSON.stringify(data.calendar.todayEvents)}
EVENTI PROSSIMI (7 GIORNI): ${JSON.stringify(data.calendar.upcomingEvents.slice(0, 7))}
CONCETTI RECENTI NEL SECONDO CERVELLO: ${data.secondBrain.recentConcepts.map(c => c.concept).join(', ')}
FONTI SECONDO CERVELLO NON PROCESSATE: ${data.secondBrain.unprocessedSources.length}
CONTESTO METEO ED EFFETTO SUGLI IMPEGNI: ${data.weather?.summaryForAI ?? 'Dati meteo non disponibili.'}

Elenca in modo conciso (bullet points) le 3-5 informazioni più importanti per la giornata. Sii chiaro, diretto, senza enfasi drammatica o urgenza artificiosa. Se il meteo ha un impatto pratico su impegni (es. pioggia all'uscita o caldo prima dello sport), segnalalo concretamente.`

  const factsRequest: GroqReasoningRequest = {
    model: 'qwen/qwen3.8-27b',
    messages: [{ role: 'user', content: factsPrompt }],
    max_tokens: 600,
    temperature: 0.3,
    reasoning_effort: 'low',
    reasoning_format: 'hidden',
  }
  const factsResponse = await groq.chat.completions.create(factsRequest)

  const keyFacts = factsResponse.choices[0]?.message?.content ?? ''

  // Stage 2: Structured JSON synthesis
  const synthesisPrompt = `Sei l'assistente per la dashboard Life OS di Simone.
Linee guida essenziali:
- Tratta questo anno con assoluta normalità (non fare riferimenti ansiogeni a esami o maturità).
- Tono calmo, sobrio, amichevole e orientato all'equilibrio tra impegni, sport e riposo.
- Non pianificare il suo tempo: Simone è l'essere umano, l'AI suggerisce solo con tatto.
- METEO: Usa il meteo SOLO se altera materialmente l'interpretazione della giornata (es. pioggia attorno all'orario di uscita da scuola, tragitto compromesso per l'allenamento, o picco di calore prima dello sport). Non inserire mai frasi generiche o ovvie come "vestiti a cipolla" o "ricorda l'ombrello".

Fatti chiave estratti per oggi (${todayFormatted}):
${keyFacts}

Genera un JSON valido con questa struttura esatta:
{
  "greeting": "un saluto cordiale e sobrio (1 frase)",
  "dayOverview": "panoramica calma della giornata basata sugli eventi in programma (2-3 frasi)",
  "priorities": [
    {
      "title": "titolo sintetico",
      "context": "breve spiegazione",
      "source": "school|sport|personal|newsletter",
      "urgency": "high|medium|low"
    }
  ],
  "secondBrainInsight": "una breve osservazione su cosa sta approfondendo Simone nel Secondo Cervello (1 frase)",
  "energyForecast": "stima brevissima del carico cognitivo/fisico (max 5-6 parole)",
  "newsletterNote": "nota sul progetto newsletter o idee rilevanti, altrimenti stringa vuota",
  "weatherNote": "nota pratica e contestuale su come il meteo incide su impegni o spostamenti (se rilevante, altrimenti stringa vuota)"
}

Rispondi rigorosamente SOLO con il JSON, senza testo o blocchi markdown attorno.`

  const synthesisRequest: GroqReasoningRequest = {
    model: 'qwen/qwen3.8-27b',
    messages: [{ role: 'user', content: synthesisPrompt }],
    max_tokens: 850,
    temperature: 0.4,
    response_format: { type: 'json_object' },
    reasoning_effort: 'none',
    reasoning_format: 'hidden',
  }
  const synthesisResponse = await groq.chat.completions.create(synthesisRequest)

  const raw = synthesisResponse.choices[0]?.message?.content ?? '{}'
  const parsed = JSON.parse(raw)

  return {
    date: data.date,
    greeting: parsed.greeting ?? '',
    dayOverview: parsed.dayOverview ?? '',
    priorities: parsed.priorities ?? [],
    secondBrainInsight: parsed.secondBrainInsight ?? '',
    energyForecast: parsed.energyForecast ?? '',
    newsletterNote: parsed.newsletterNote ?? '',
    weatherNote: parsed.weatherNote ?? '',
    inputHash,
    generatedAt: new Date().toISOString(),
  }
}
