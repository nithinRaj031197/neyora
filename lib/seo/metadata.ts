import 'server-only'

/**
 * Metadata construction, all in one place.
 *
 * Every field falls back through: page value -> site default -> hardcoded
 * safety net. That means an editor who leaves an SEO field blank still gets a
 * correct, non-empty tag rather than a missing one.
 */
import type { Metadata } from 'next'
import { absoluteUrl, publicEnv } from '@/lib/env'
import { excerptFromMarkdown, truncate } from '@/lib/markdown/plain'
import { bestFallbackSrc, type MediaLike } from '@/lib/media'
import type { MediaRow, SiteSettingsRow } from '@/types/database'

export const OG_IMAGE_WIDTH = 1200
export const OG_IMAGE_HEIGHT = 630

export interface BuildMetadataArgs {
  title: string
  description?: string | null
  /** Markdown to derive a description from when none is supplied. */
  descriptionSource?: string | null
  path: string
  canonicalOverride?: string | null
  image?: MediaLike | MediaRow | null
  imageAlt?: string | null
  noindex?: boolean
  type?: 'website' | 'article'
  publishedTime?: string | null
  modifiedTime?: string | null
  settings: SiteSettingsRow
  /** Appends " — NEYORA". Off for the homepage, which is already the brand. */
  appendBrand?: boolean
}

export function buildMetadata({
  title,
  description,
  descriptionSource,
  path,
  canonicalOverride,
  image,
  imageAlt,
  noindex = false,
  type = 'website',
  publishedTime,
  modifiedTime,
  settings,
  appendBrand = true,
}: BuildMetadataArgs): Metadata {
  const brand = settings.brand_name || 'NEYORA'

  const resolvedTitle = appendBrand && !title.includes(brand) ? `${title} — ${brand}` : title

  const resolvedDescription = truncate(
    description?.trim() ||
      (descriptionSource ? excerptFromMarkdown(descriptionSource, 300) : '') ||
      settings.default_seo_description ||
      'NEYORA grows fresh, natural food with care.',
    300,
  )

  const canonical = canonicalOverride?.trim() || absoluteUrl(path)
  const ogImage = image ? bestFallbackSrc(image) : null
  const absoluteOgImage = ogImage
    ? ogImage.startsWith('http')
      ? ogImage
      : absoluteUrl(ogImage)
    : null

  const images = absoluteOgImage
    ? [
        {
          url: absoluteOgImage,
          width: image?.width ?? OG_IMAGE_WIDTH,
          height: image?.height ?? OG_IMAGE_HEIGHT,
          alt: imageAlt ?? image?.alt ?? resolvedTitle,
        },
      ]
    : undefined

  return {
    title: resolvedTitle,
    description: resolvedDescription,
    alternates: { canonical },
    robots: noindex
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
      ...(type === 'article'
        ? {
            publishedTime: publishedTime ?? undefined,
            modifiedTime: modifiedTime ?? undefined,
          }
        : {}),
    },
    twitter: {
      card: images ? 'summary_large_image' : 'summary',
      title: resolvedTitle,
      description: resolvedDescription,
      images: absoluteOgImage ? [absoluteOgImage] : undefined,
    },
  }
}

/** Root metadata: title template, verification, icons, and the OG fallback. */
export function buildRootMetadata(settings: SiteSettingsRow, ogImage: MediaRow | null): Metadata {
  const env = publicEnv()
  const brand = settings.brand_name || 'NEYORA'
  const title = settings.default_seo_title || `${brand} — Fresh Natural Food`
  const description =
    settings.default_seo_description || 'NEYORA grows fresh, natural food with care.'

  return {
    metadataBase: new URL(env.siteUrl),
    title: { default: title, template: `%s` },
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
    authors: [{ name: settings.organization_legal_name || brand }],
    creator: brand,
    publisher: settings.organization_legal_name || brand,
    formatDetection: { telephone: false, address: false, email: false },
    icons: {
      icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
      apple: [{ url: '/icon.svg' }],
    },
    openGraph: {
      type: 'website',
      siteName: brand,
      title,
      description,
      url: env.siteUrl,
      locale: 'en_IN',
      images: ogImage
        ? [
            {
              url: bestFallbackSrc(ogImage).startsWith('http')
                ? bestFallbackSrc(ogImage)
                : absoluteUrl(bestFallbackSrc(ogImage)),
              width: ogImage.width ?? OG_IMAGE_WIDTH,
              height: ogImage.height ?? OG_IMAGE_HEIGHT,
              alt: ogImage.alt ?? title,
            },
          ]
        : undefined,
    },
    twitter: { card: 'summary_large_image', title, description },
    verification: env.googleSiteVerification
      ? { google: env.googleSiteVerification }
      : undefined,
  }
}
