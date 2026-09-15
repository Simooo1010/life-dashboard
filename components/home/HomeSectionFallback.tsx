import React from 'react'

interface HomeSectionFallbackProps {
  label: string
  heading?: string
  tall?: boolean
}

export function HomeSectionFallback({ label, heading, tall = false }: HomeSectionFallbackProps) {
  return (
    <section aria-busy="true" aria-label={`${label} in caricamento`} className="space-y-3">
      <p className="section-label">{label}</p>
      {heading && (
        <h1 className="text-2xl md:text-3xl font-semibold text-ink leading-snug">
          {heading}
        </h1>
      )}
      <div className={`card overflow-hidden ${tall ? 'h-44' : 'h-28'}`}>
        <div className="h-3 w-1/3 rounded-full bg-border animate-pulse" />
        <div className="mt-4 h-2 w-full rounded-full bg-border/70 animate-pulse" />
        <div className="mt-2 h-2 w-4/5 rounded-full bg-border/70 animate-pulse" />
      </div>
    </section>
  )
}
