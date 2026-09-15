import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Life OS',
  description: 'Dashboard personale',
  robots: 'noindex, nofollow',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="it">
      <body className="bg-canvas text-ink antialiased">
        {children}
      </body>
    </html>
  )
}
