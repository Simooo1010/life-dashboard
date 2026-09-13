import { AppShell } from '@/components/layout/AppShell'
import { LifeOsDashboard } from '@/components/life-os/LifeOsDashboard'
import { fetchLifeOsOverview } from '@/lib/life-os/service'

export const dynamic = 'force-dynamic'

export default async function LifeOsPage() {
  const overview = await fetchLifeOsOverview()

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8">
        <LifeOsDashboard overview={overview} />
      </main>
    </AppShell>
  )
}
