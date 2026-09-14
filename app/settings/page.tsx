'use client'

import { AppShell } from '@/components/layout/AppShell'
import { useState } from 'react'
import { RefreshCw, CheckCircle } from 'lucide-react'

export default function SettingsPage() {
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)

  async function handleForceSync() {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/sync/all?force=1')
      if (res.ok) {
        setSyncResult('Sync completato con successo.')
      } else {
        setSyncResult('Errore durante il sync.')
      }
    } catch {
      setSyncResult('Errore di rete.')
    } finally {
      setSyncing(false)
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
                Rigenera la sintesi anche se i dati non sono cambiati.
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
            {syncResult && (
              <p className="text-xs text-green-700 dark:text-green-400 flex items-center gap-1">
                <CheckCircle size={12} />
                {syncResult}
              </p>
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
