export default function Loading() {
  return (
    <div className="min-h-dvh bg-canvas flex items-center justify-center px-4">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center animate-pulse">
          <span className="text-xl">⬡</span>
        </div>
        <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        <p className="text-sm text-ink-muted">Preparazione della tua giornata…</p>
      </div>
    </div>
  )
}
