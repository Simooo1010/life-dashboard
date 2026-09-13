import { AppShell } from '@/components/layout/AppShell'
import { ExternalLink } from 'lucide-react'

export default function NewsletterPage() {
  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-8 space-y-8">
        <h1 className="text-xl font-semibold text-ink">Newsletter</h1>

        <div className="card space-y-5">
          <div>
            <p className="section-label mb-2">Missione</p>
            <p className="text-sm text-ink leading-relaxed">
              Aiutare le persone comuni a capire davvero l&apos;AI — inclusi i principianti assoluti.
              Ispirata a Daniel Kokotajlo e Diary of a CEO.
            </p>
          </div>

          <div className="border-t border-border pt-4">
            <p className="section-label mb-2">Formato</p>
            <p className="text-sm text-ink-muted leading-relaxed">
              Articoli brevi quotidiani, accessibili a tutti i livelli. Un quiz di onboarding per
              segmentare i lettori.
            </p>
          </div>

          <div className="border-t border-border pt-4">
            <p className="section-label mb-2">Risorse</p>
            <a
              href="https://notion.so"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
            >
              <ExternalLink size={12} />
              Apri Master Brief in Notion
            </a>
          </div>
        </div>

        <div className="card bg-amber-50 border-amber-200">
          <p className="text-sm text-amber-800 leading-relaxed">
            Le analisi e i suggerimenti sulla newsletter vengono generati automaticamente ogni mattina
            nella dashboard principale.
          </p>
        </div>
      </div>
    </AppShell>
  )
}
