'use client'

import { AppShell } from '@/components/layout/AppShell'
import { useEffect, useRef, useState } from 'react'
import { RefreshCw, CheckCircle, XCircle, Circle, Loader2 } from 'lucide-react'

const SOURCE_LABELS: Record<string, string> = {
  'calendar': 'Calendario',
  'life-os': 'Life OS',
  'second-brain': 'Secondo Cervello',
  'newsletter': 'Newsletter',
  'weather': 'Meteo',
  'finance': 'Finanze',
  'synthesis': 'Sintesi AI',
}

const SOURCES = Object.keys(SOURCE_LABELS)

type SourceStatus = 'running' | 'done' | 'error'

interface SyncLogEntry {
  id: number | string
  source: string
  trigger: 'manual' | 'auto'
  status: 'success' | 'error'
  startedAt: string
  finishedAt: string
  durationMs: number
  errorMessage: string | null
}

export default function SettingsPage() {
  const [syncing, setSyncing] = useState(false)
  const [statuses, setStatuses] = useState<Record<string, SourceStatus>>({})
  const [sourceErrors, setSourceErrors] = useState<Record<string, string>>({})
  const [syncResult, setSyncResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [history, setHistory] = useState<SyncLogEntry[]>([])
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const esRef = useRef<EventSource | null>(null)

  async function loadHistory() {
    try {
      const res = await fetch('/api/sync/history', { cache: 'no-store' })
      if (!res.ok) {
        setHistoryError(`Impossibile leggere lo storico (HTTP ${res.status}).`)
        return
      }
      const data = await res.json()
      setHistory(data.entries ?? [])
      setHistoryError(data.error ?? null)
    } catch {
      setHistoryError('Impossibile leggere lo storico: errore di rete.')
    } finally {
      setHistoryLoaded(true)
    }
  }

  useEffect(() => {
    loadHistory()
    return () => esRef.current?.close()
  }, [])

  function handleForceSync() {
    if (syncing) return
    setSyncing(true)
    setSyncResult(null)
    setSourceErrors({})
    setStatuses(Object.fromEntries(SOURCES.map(s => [s, 'running' as const])))

    const es = new EventSource('/api/sync/all?force=1')
    esRef.current = es
    const results: Record<string, SourceStatus> = {}
    let finished = false

    const finish = (result: { ok: boolean; message: string }) => {
      finished = true
      setSyncResult(result)
      setSyncing(false)
      setStatuses(prev => Object.fromEntries(Object.entries(prev).map(([source, status]) => [source, status === 'running' ? 'error' : status])))
      es.close()
      loadHistory()
    }

    es.onmessage = event => {
      try {
        const payload = JSON.parse(event.data)
        if (payload.done) {
          const failed = Object.values(results).filter(status => status === 'error').length
          const updated = Object.values(results).filter(status => status === 'done').length
          if (payload.error) finish({ ok: false, message: `Sync interrotto: ${payload.error}` })
          else if (failed > 0) finish({ ok: false, message: `Sync completato: ${updated} fonti aggiornate, ${failed} con errori.` })
          else finish({ ok: true, message: `Sync completato: ${updated} fonti aggiornate.` })
          return
        }
        if (payload.source) {
          const status: SourceStatus = payload.status === 'error' ? 'error' : 'done'
          results[payload.source] = status
          setStatuses(prev => ({ ...prev, [payload.source]: status }))
          if (payload.error) setSourceErrors(prev => ({ ...prev, [payload.source]: payload.error }))
        }
      } catch {
        // ignore malformed events
      }
    }

    es.onerror = () => {
      if (!finished) finish({ ok: false, message: 'Connessione interrotta prima della fine del sync (timeout o errore del server).' })
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-8 space-y-8">
        <h1 className="text-xl font-semibold text-ink">Impostazioni</h1>

        {/* Sync */}
        <section>
          <p className="section-label mb-3">Sincronizzazione</p>
          <div className="card space-y-4">
            <div>
              <p className="text-sm font-medium text-ink">Forza aggiornamento</p>
              <p className="text-xs text-ink-muted mt-0.5">
                Ricontrolla tutte le fonti e rigenera la sintesi anche se i dati non sono cambiati.
              </p>
            </div>
            <button
              onClick={handleForceSync}
              disabled={syncing}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-ink border border-border rounded-xl hover:bg-surface transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Sincronizzazione…' : 'Forza sync'}
            </button>

            {Object.keys(statuses).length > 0 && (
              <ul className="space-y-1.5 pt-1">
                {SOURCES.map(source => {
                  const status = statuses[source]
                  return (
                    <li key={source} className="text-xs text-ink-muted">
                      <div className="flex items-center gap-2">
                        {status === 'done' && <CheckCircle size={13} className="text-green-600 dark:text-green-400 shrink-0" />}
                        {status === 'error' && <XCircle size={13} className="text-red-600 dark:text-red-400 shrink-0" />}
                        {status === 'running' && <Loader2 size={13} className="animate-spin text-accent shrink-0" />}
                        {!status && <Circle size={13} className="text-ink-faint shrink-0" />}
                        <span>{SOURCE_LABELS[source]}</span>
                      </div>
                      {status === 'error' && sourceErrors[source] && (
                        <p className="ml-5 mt-0.5 break-words text-2xs text-red-600/80 dark:text-red-400/80">{sourceErrors[source]}</p>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}

            {syncResult && (
              <p className={`text-xs flex items-center gap-1 ${syncResult.ok ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}`}>
                {syncResult.ok ? <CheckCircle size={12} /> : <XCircle size={12} />}
                {syncResult.message}
              </p>
            )}
          </div>
        </section>

        {/* Sync log */}
        <section>
          <p className="section-label mb-3">Storico sincronizzazioni</p>
          <div className="card">
            {historyError && (
              <p className="mb-3 flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400">
                <XCircle size={12} className="mt-0.5 shrink-0" />
                <span>{historyError}</span>
              </p>
            )}
            {!historyLoaded ? (
              <p className="text-xs text-ink-muted">Caricamento…</p>
            ) : history.length === 0 ? (
              <p className="text-xs text-ink-muted">Nessuna sincronizzazione registrata.</p>
            ) : (
              <ul className="divide-y divide-border max-h-80 overflow-y-auto">
                {history.map(entry => (
                  <li key={entry.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      {entry.status === 'success'
                        ? <CheckCircle size={12} className="text-green-600 dark:text-green-400 shrink-0" />
                        : <XCircle size={12} className="text-red-600 dark:text-red-400 shrink-0" />}
                      <span className="text-ink font-medium truncate">{SOURCE_LABELS[entry.source] ?? entry.source}</span>
                      <span className="text-ink-faint shrink-0">· {entry.trigger === 'manual' ? 'Manuale' : 'Automatica'}</span>
                    </div>
                    <div className="text-ink-muted shrink-0 flex items-center gap-2">
                      <span>{entry.durationMs}ms</span>
                      <span>
                        {new Date(entry.finishedAt).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Info */}
        <section>
          <p className="section-label mb-3">Informazioni</p>
          <div className="card space-y-2 text-sm text-ink-muted">
            <p>Life OS Dashboard · v0.1.0</p>
            <p>Fonti: Notion · Google Calendar · Supabase · Groq</p>
          </div>
        </section>

        {/* Logout */}
        <section>
          <p className="section-label mb-3">Sessione</p>
          <div className="card">
            <button
              onClick={handleLogout}
              className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors font-medium"
            >
              Esci dalla dashboard
            </button>
          </div>
        </section>
      </div>
    </AppShell>
  )
}
