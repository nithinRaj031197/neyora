import type { Metadata, Viewport } from 'next'
import { Fraunces, Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { getSiteSettings } from '@/lib/content'
import { buildRootMetadata } from '@/lib/seo/metadata'

/**
 * Three faces, no more.
 *
 * Fraunces for display: a variable serif with real optical sizing, warm and
 * organic rather than the Playfair look every food site already has.
 * Geist for body and UI, Geist Mono for anything that must align in columns
 * (harvest dates, batch codes, admin tables).
 *
 * `display: 'swap'` and self-hosting via next/font mean no layout shift and no
 * request to Google at runtime.
 */
const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-fraunces',
  // No `weight` list: Fraunces is loaded as a variable font so the whole
  // weight range is available from one file, and `axes` may only be declared
  // for a variable axis. `opsz` is why this face was chosen — it adjusts
  // contrast and detail with size, which is what makes a large hero headline
  // look drawn rather than scaled up.
  axes: ['SOFT', 'WONK', 'opsz'],
  fallback: ['Times New Roman', 'Georgia', 'serif'],
})

const geist = Geist({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist',
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist-mono',
  fallback: ['ui-monospace', 'SF Mono', 'Menlo', 'monospace'],
})

export async function generateMetadata(): Promise<Metadata> {
  return buildRootMetadata(await getSiteSettings())
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Never lock zoom — pinch-to-zoom is an accessibility requirement, and the
  // QR landing is used one-handed on a phone in a kitchen.
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F6F0E3' },
    { media: '(prefers-color-scheme: dark)', color: '#123C2A' },
  ],
  colorScheme: 'light',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${geist.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh bg-ivory font-sans text-earth antialiased">{children}</body>
    </html>
  )
}
