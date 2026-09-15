import { createClient } from '@supabase/supabase-js'

// ─── Life Dashboard Dedicated Supabase Client ─────────────────────────────────
// Used for cloud persistence / daily synthesis cache on Vercel
const dashboardUrl =
  process.env.DASHBOARD_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_DASHBOARD_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL

const dashboardKey =
  process.env.DASHBOARD_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_DASHBOARD_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function isDashboardSupabaseConfigurationValid(
  url: string | undefined,
  key: string | undefined,
): boolean {
  if (!url || !key) return false
  if (/^(?:your|tuo)[-_]/i.test(key) || /[<>]/.test(key)) return false

  try {
    const hostname = new URL(url).hostname.toLowerCase()
    const project = hostname.split('.')[0] ?? ''
    return hostname.endsWith('.supabase.co')
      && !/^(?:your|tuo)[-_]/i.test(project)
      && !/[<>]/.test(project)
  } catch {
    return false
  }
}

export const dashboardSupabase =
  isDashboardSupabaseConfigurationValid(dashboardUrl, dashboardKey)
    ? createClient(dashboardUrl!, dashboardKey!)
    : null
