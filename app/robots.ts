import type { MetadataRoute } from 'next'
import { absoluteUrl, publicEnv } from '@/lib/env'

/**
 * robots.txt
 *
 * /admin and /api are disallowed for tidiness, and /go because a QR doorway
 * in search results is noise. None of this is a security measure — /admin is
 * protected by authentication and RLS, not by asking crawlers politely.
 */
export default function robots(): MetadataRoute.Robots {
  const { siteUrl } = publicEnv()
  const isProduction = !/localhost|127\.0\.0\.1|\.local(?::|$)/.test(siteUrl)

  if (!isProduction) {
    // Never let a preview or local build get indexed.
    return { rules: [{ userAgent: '*', disallow: '/' }] }
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/', '/api/', '/go', '/go/'],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: siteUrl,
  }
}
