'use client'

import { useEffect } from 'react'

const MIN_INTERVAL_MS = 30_000
const STORAGE_KEY = 'life-dashboard:last-refresh-ping'

/**
 * Fires a fire-and-forget ping on mount so stale sources catch up in the
 * background without blocking first paint. Debounced via sessionStorage so
 * rapid navigation between pages doesn't spam the endpoint.
 */
export function BackgroundSyncTrigger() {
  useEffect(() => {
    try {
      const last = Number(sessionStorage.getItem(STORAGE_KEY) ?? 0)
      if (Date.now() - last < MIN_INTERVAL_MS) return
      sessionStorage.setItem(STORAGE_KEY, String(Date.now()))
    } catch {
      // sessionStorage unavailable (private mode, etc.) — proceed anyway
    }

    fetch('/api/sync/refresh-stale', { method: 'POST', keepalive: true }).catch(() => {})
  }, [])

  return null
}
