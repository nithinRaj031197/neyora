import type { Metadata, Viewport } from 'next'
import { Fraunces, Inter } from 'next/font/google'
import './globals.css'
import { getMediaByIds, getSiteSettings } from '@/lib/content/site'
import { buildRootMetadata } from '@/lib/seo/metadata'
import { isSupabaseConfigured } from '@/lib/env'

/**
 * Fraunces for display: a variable serif with real optical sizing, warm and
 * organic rather than the Playfair look every food site already has.
 * Inter for body and UI.
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

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
})

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()
  const media = await getMediaByIds([settings.default_og_image_id])
  const og = settings.default_og_image_id ? media.get(settings.default_og_image_id) ?? null : null
  return buildRootMetadata(settings, og)
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
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        {/* Storage lives on a different origin, so warm the connection early. */}
        {isSupabaseConfigured() && process.env.NEXT_PUBLIC_SUPABASE_URL ? (
          <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} crossOrigin="" />
        ) : null}
      </head>
      <body className="min-h-dvh bg-ivory font-sans text-earth antialiased">{children}</body>
    </html>
  )
}
