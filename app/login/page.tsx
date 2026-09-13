'use client'

import { useState } from 'react'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (res.ok) {
        // Full navigation instead of router.push: the dashboard does a slow
        // server-side data fetch, and a client-side push here would race
        // with the auth cookie/session and can get silently aborted. Keep
        // the button in its loading state until the browser navigates away.
        window.location.href = '/'
        return
      }

      const data = await res.json()
      setError(data.error ?? 'Accesso non riuscito')
      setPassword('')
      setLoading(false)
    } catch {
      setError('Errore di rete')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-canvas flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-xl">⬡</span>
          </div>
          <h1 className="text-xl font-semibold text-ink">Life OS</h1>
          <p className="text-sm text-ink-muted mt-1">Accesso privato</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="sr-only">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus
              autoComplete="current-password"
              required
              className="w-full px-4 py-3 text-sm bg-white dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl
                         focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent
                         placeholder:text-ink-faint dark:placeholder:text-ink-faint-dark dark:text-ink-dark transition-all"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 text-center animate-fade-in">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3 bg-accent text-white text-sm font-medium rounded-xl
                       hover:bg-accent/90 active:scale-[0.98] transition-all
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Accesso…' : 'Entra'}
          </button>
        </form>
      </div>
    </div>
  )
}
