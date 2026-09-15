import { AppShell } from '@/components/layout/AppShell'
import { LifeOsDashboard } from '@/components/life-os/LifeOsDashboard'
import { loadCachedLifeOsOverview } from '@/lib/cache/dashboard-data'
import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

async function LifeOsContent() {
  const overview = await loadCachedLifeOsOverview()
  return <LifeOsDashboard overview={overview} />
}

function LifeOsFallback() {
  return (
    <div aria-busy="true" className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Life OS</h1>
      <div className="card h-40 animate-pulse" />
      <div className="card h-56 animate-pulse" />
    </div>
  )
}

export default function LifeOsPage() {
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8">
        <Suspense fallback={<LifeOsFallback />}>
          <LifeOsContent />
        </Suspense>
      </div>
    </AppShell>
  )
}
