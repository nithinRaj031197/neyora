import 'server-only'

/**
 * Metadata construction, all in one place.
 *
 * Every field falls through: page value → site default → hardcoded safety net.
 * An author who leaves an SEO field blank still gets a correct tag rather than
 * a missing one.
 */
import type { Metadata } from 'next'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { absoluteUrl, publicEnv } from '@/lib/env'
import { excerptFromMarkdown, truncate } from '@/lib/markdown/plain'
import type { Image, Seo, SiteSettings } from '@/types/content'

export const OG_IMAGE_WIDTH = 1200
export const OG_IMAGE_HEIGHT = 630

function publicAssetExists(src: string): boolean {
  if (!src.startsWith('/') || src.includes('..')) return false
  return existsSync(join(process.cwd(), 'public', src))
}

function resolveTemporaryImageFallback(src: string | undefined): string | undefined {
  if (!src || !src.endsWith('.webp') || publicAssetExists(src)) return src

  const sameNameSvg = src.replace(/\.webp$/, '.svg')
  if (publicAssetExists(sameNameSvg)) return sameNameSvg

  if (src === '/images/hero/neyora-og-card.webp') {
    const legacyOgPlaceholder = '/images/hero/oyster-mushroom-hero.svg'
    if (publicAssetExists(legacyOgPlaceholder)) return legacyOgPlaceholder
  }

  return src
}

export interface BuildMetadataArgs {
  title: string
  description?: string
  /** Markdown to derive a description from when none is supplied. */
  descriptionSource?: string
  path: string
  image?: Image | null
  seo?: Seo
  type?: 'website' | 'article'
  publishedTime?: string
  modifiedTime?: string
  settings: SiteSettings
  /** Appends " — NEYORA". Off for the homepage, already the brand. */
  appendBrand?: boolean
}

export function buildMetadata({
  title,
  description,
  descriptionSource,
  path,
  image,
  seo,
  type = 'website',
  publishedTime,
  modifiedTime,
  settings,
  appendBrand = true,
}: BuildMetadataArgs): Metadata {
  const brand = settings.brandName || 'NEYORA'

  const resolvedTitle = seo?.title ?? (appendBrand && !title.includes(brand) ? `${title} — ${brand}` : title)

  const resolvedDescription = truncate(
    seo?.description ||
      description?.trim() ||
      (descriptionSource ? excerptFromMarkdown(descriptionSource, 300) : '') ||
      settings.seo.defaultDescription ||
      'NEYORA grows fresh, natural food with care.',
    300,
  )

  const canonical = seo?.canonicalUrl || absoluteUrl(path)

  const ogSrc = resolveTemporaryImageFallback(
    seo?.ogImage ?? image?.src ?? settings.seo.defaultOgImage,
  )
  const images = ogSrc
    ? [
        {
          url: ogSrc.startsWith('http') ? ogSrc : absoluteUrl(ogSrc),
          width: image?.width ?? OG_IMAGE_WIDTH,
          height: image?.height ?? OG_IMAGE_HEIGHT,
          alt: image?.alt ?? resolvedTitle,
        },
      ]
    : undefined

  return {
    title: resolvedTitle,
    description: resolvedDescription,
    alternates: { canonical },
    robots: seo?.noindex
      ? { index: false, follow: false, nocache: true }
      : {
          index: true,
          follow: true,
          googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
        },
    openGraph: {
      type,
      title: resolvedTitle,
      description: resolvedDescription,
      url: canonical,
      siteName: brand,
      locale: 'en_IN',
      images,
      ...(type === 'article' ? { publishedTime, modifiedTime } : {}),
    },
    twitter: {
      card: images ? 'summary_large_image' : 'summary',
      title: resolvedTitle,
      description: resolvedDescription,
      images: images?.map((i) => i.url),
    },
  }
}

/** Root metadata: title, verification, icons and the Open Graph fallback. */
export function buildRootMetadata(settings: SiteSettings): Metadata {
  const env = publicEnv()
  const brand = settings.brandName || 'NEYORA'
  const title = settings.seo.defaultTitle || `${brand} — Fresh Natural Food`
  const description =
    settings.seo.defaultDescription || 'NEYORA grows fresh, natural food with care.'
  const ogImage = resolveTemporaryImageFallback(settings.seo.defaultOgImage)

  return {
    metadataBase: new URL(env.siteUrl),
    title: { default: title, template: '%s' },
    description,
    applicationName: brand,
    referrer: 'strict-origin-when-cross-origin',
    keywords: [
      brand,
      'fresh oyster mushrooms',
      'natural food',
      'farm fresh produce',
      'oyster mushroom recipes',
    ],
    authors: [{ name: settings.seo.organizationLegalName || brand }],
    creator: brand,
    publisher: settings.seo.organizationLegalName || brand,
    formatDetection: { telephone: false, address: false, email: false },
    icons: { icon: [{ url: '/icon.svg', type: 'image/svg+xml' }], apple: [{ url: '/icon.svg' }] },
    openGraph: {
      type: 'website',
      siteName: brand,
      title,
      description,
      url: env.siteUrl,
      locale: 'en_IN',
      images: ogImage ? [{ url: absoluteUrl(ogImage), width: 1200, height: 630, alt: title }] : undefined,
    },
    twitter: { card: 'summary_large_image', title, description },
    verification: env.googleSiteVerification ? { google: env.googleSiteVerification } : undefined,
  }
}
