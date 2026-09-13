import Groq from 'groq-sdk'
import { createHash } from 'crypto'
import type { FinanceSnapshot } from '@/lib/finance/types'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export interface FinanceInsights {
  observations: string[]
  generatedAt: string
  inputHash: string
}

function computeInputHash(snapshot: FinanceSnapshot, mode: string): string {
  const payload = JSON.stringify({
    mode,
    totalBalance: snapshot.totalBalance,
    wallets: snapshot.wallets.map(w => `${w.slug}:${w.balance.toFixed(2)}`).sort(),
    last7Days: snapshot.last7Days,
    last30Days: snapshot.last30Days,
    debts: snapshot.debts,
    recentTransactions: snapshot.recentTransactions
      .slice(0, 15)
      .map(t => `${t.date}|${t.title}|${t.amount}|${t.type}|${t.walletSlug}`),
  })
  return createHash('sha256').update(payload).digest('hex')
}

function formatSnapshotForPrompt(snapshot: FinanceSnapshot): string {
  const walletLines = snapshot.wallets
    .map(w => `- ${w.name} (${w.slug}): €${w.balance.toFixed(2)}`)
    .join('\n')

  const txLines = snapshot.recentTransactions
    .slice(0, 20)
    .map(t => {
      const date = new Date(t.date).toLocaleDateString('it-IT')
      const sign = t.type === 'income' ? 'Entrata' : 'Uscita'
      const flag = t.isTransfer ? ' [trasferimento interno]' : t.isDebt ? ' [debito/credito]' : ''
      return `- [${date}] ${sign} su ${t.walletName}: "${t.title}" (€${t.amount.toFixed(2)})${flag}`
    })
    .join('\n')

  const debtLines = snapshot.debts.items.length
    ? snapshot.debts.items
        .map(d => `- ${d.type === 'to_me' ? 'Credito da' : 'Debito verso'} ${d.person}: "${d.desc}" (€${d.amount.toFixed(2)})`)
        .join('\n')
    : 'Nessun debito o credito attivo.'

  return `SALDO TOTALE: €${snapshot.totalBalance.toFixed(2)}

PORTAFOGLI:
${walletLines || 'Nessun portafoglio configurato.'}

ULTIMI 7 GIORNI: entrate €${snapshot.last7Days.income.toFixed(2)}, uscite €${snapshot.last7Days.expense.toFixed(2)}, saldo netto €${snapshot.last7Days.net.toFixed(2)}${snapshot.last7Days.savingsRate !== null ? `, tasso di risparmio ${snapshot.last7Days.savingsRate.toFixed(1)}%` : ''} (${snapshot.last7Days.transactionCount} movimenti)

ULTIMI 30 GIORNI: entrate €${snapshot.last30Days.income.toFixed(2)}, uscite €${snapshot.last30Days.expense.toFixed(2)}, saldo netto €${snapshot.last30Days.net.toFixed(2)}${snapshot.last30Days.savingsRate !== null ? `, tasso di risparmio ${snapshot.last30Days.savingsRate.toFixed(1)}%` : ''} (${snapshot.last30Days.transactionCount} movimenti)

TRANSAZIONI RECENTI:
${txLines || 'Nessuna transazione recente.'}

DEBITI E CREDITI ATTIVI (crediti €${snapshot.debts.totalCredits.toFixed(2)}, debiti €${snapshot.debts.totalDebts.toFixed(2)}):
${debtLines}`
}

export async function generateFinanceInsights(
  snapshot: FinanceSnapshot,
  mode: 'compact' | 'full' = 'compact',
): Promise<FinanceInsights> {
  const inputHash = computeInputHash(snapshot, mode)
  const count = mode === 'compact' ? '3 e 5' : '5 e 8'

  const prompt = `Sei l'analista finanziario della dashboard Life OS di Simone. Analizzi i dati REALI del suo Personal Finance Tracker qui sotto — questa è la tua UNICA fonte di informazione.

${formatSnapshotForPrompt(snapshot)}

Genera tra ${count} osservazioni sintetiche e ad alto segnale su questa situazione finanziaria. Dai priorità a:
- cambiamenti rilevanti nella spesa o nei risparmi (confronto 7gg vs 30gg);
- movimenti recenti insoliti o degni di nota;
- variazioni nei fondi disponibili;
- pattern rilevanti tra le transazioni recenti;
- relazioni significative tra saldo attuale e attività recente.

REGOLE FONDAMENTALI:
- Basati ESCLUSIVAMENTE sui dati forniti sopra. Non inventare causali, motivazioni o spiegazioni per le transazioni che non siano esplicitamente presenti nei dati.
- Non dare consigli finanziari generici scollegati dai dati reali (niente coaching da manuale).
- Tono sobrio e diretto, mai allarmistico, anche se emergono spese elevate o saldo basso.
- Se i dati disponibili non permettono osservazioni utili, restituisci meno osservazioni invece di inventarne di vaghe.
- Ogni osservazione è una frase breve e concreta (max ~25 parole), in italiano.

Rispondi SOLO con JSON valido in questa forma esatta, senza testo o markdown attorno:
{ "observations": ["...", "..."] }`

  const response = await groq.chat.completions.create({
    model: 'qwen/qwen3.8-27b',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: mode === 'compact' ? 500 : 900,
    temperature: 0.3,
    response_format: { type: 'json_object' },
    reasoning_effort: 'low',
    reasoning_format: 'hidden',
  })

  const raw = response.choices[0]?.message?.content ?? '{}'
  let observations: string[] = []
  try {
    const parsed = JSON.parse(raw)
    observations = Array.isArray(parsed.observations) ? parsed.observations.filter((o: unknown) => typeof o === 'string') : []
  } catch {
    observations = []
  }

  return { observations, generatedAt: new Date().toISOString(), inputHash }
}

// ─── Memory cache (30 minutes, keyed by input hash) ────────────────────────────
// Avoids regenerating the same interpretation on every request when the
// underlying finance data hasn't changed — mirrors the hash-based cache used
// for the daily synthesis in lib/groq/synthesis.ts.
const insightsCache = new Map<string, { insights: FinanceInsights; expiresAt: number }>()
const TTL_MS = 30 * 60 * 1000

export async function getFinanceInsights(
  snapshot: FinanceSnapshot,
  mode: 'compact' | 'full' = 'compact',
): Promise<FinanceInsights | null> {
  if (!process.env.GROQ_API_KEY) return null

  const hash = computeInputHash(snapshot, mode)
  const cached = insightsCache.get(mode)
  const now = Date.now()
  if (cached && cached.insights.inputHash === hash && now < cached.expiresAt) {
    return cached.insights
  }

  const insights = await generateFinanceInsights(snapshot, mode)
  insightsCache.set(mode, { insights, expiresAt: now + TTL_MS })
  return insights
}
