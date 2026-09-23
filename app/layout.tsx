import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Life OS',
  description: 'Dashboard personale',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Life OS',
    statusBarStyle: 'black',
  },
  robots: 'noindex, nofollow',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f5f2' },
    { media: '(prefers-color-scheme: dark)', color: '#18171a' },
  ],
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
