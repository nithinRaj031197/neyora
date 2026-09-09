import 'server-only'

/**
 * Global, every-page content: site settings, social links, navigation.
 *
 * `cache()` de-duplicates within a single request, so the footer and the
 * <head> metadata share one round-trip rather than two — which matters on the
 * Supabase free tier.
 */
import { cache } from 'react'
import { createReadOnlyClient } from '@/lib/supabase/server'
import { assertNoError } from './errors'
import { isSupabaseConfigured } from '@/lib/env'
import type { MediaRow, SiteSettingsRow, SocialLinkRow } from '@/types/database'

/** Used when Supabase is not configured, so a fresh clone still renders. */
export const FALLBACK_SETTINGS: SiteSettingsRow = {
  id: 1,
  brand_name: 'NEYORA',
  tagline: 'GROWN FOR LIFE.',
  brand_description: null,
  contact_email: null,
  contact_phone: null,
  whatsapp_number: null,
  whatsapp_message: null,
  address_line1: null,
  address_line2: null,
  city: null,
  state: null,
  postal_code: null,
  country: null,
  google_maps_url: null,
  business_hours: null,
  footer_tagline: null,
  footer_note: null,
  copyright_holder: 'NEYORA',
  announcement_text: null,
  announcement_href: null,
  announcement_enabled: false,
  default_seo_title: 'NEYORA — Fresh Natural Food',
  default_seo_description: 'NEYORA grows fresh, natural food with care.',
  default_og_image_id: null,
  organization_legal_name: null,
  extras: {},
  created_at: new Date(0).toISOString(),
  updated_at: new Date(0).toISOString(),
}

export const getSiteSettings = cache(async (): Promise<SiteSettingsRow> => {
  if (!isSupabaseConfigured()) return FALLBACK_SETTINGS

  const supabase = createReadOnlyClient()
  const { data, error } = await supabase.from('site_settings').select('*').eq('id', 1).maybeSingle()
  assertNoError('site_settings', error)
  return data ?? FALLBACK_SETTINGS
})

export const getSocialLinks = cache(async (): Promise<SocialLinkRow[]> => {
  if (!isSupabaseConfigured()) return []

  const supabase = createReadOnlyClient()
  const { data, error } = await supabase
    .from('social_links')
    .select('*')
    .eq('enabled', true)
    .neq('url', '')
    .order('sort_order', { ascending: true })
  assertNoError('social_links', error)
  return data ?? []
})

/**
 * Batch media lookup.
 *
 * Content rows store `*_image_id` references, so a page would otherwise issue
 * one query per image. This resolves them all in a single `in (...)` query.
 */
export const getMediaByIds = cache(
  async (ids: readonly (string | null | undefined)[]): Promise<Map<string, MediaRow>> => {
    const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))]
    if (unique.length === 0 || !isSupabaseConfigured()) return new Map()

    const supabase = createReadOnlyClient()
    const { data, error } = await supabase
      .from('media')
      .select('*')
      .in('id', unique)
      .is('deleted_at', null)
    assertNoError('media by ids', error)

    return new Map((data ?? []).map((m) => [m.id, m]))
  },
)

export interface WhatsAppLink {
  href: string
  display: string
}

/**
 * Builds a wa.me link from the admin-configured number.
 *
 * Returns null when no number is set, so callers hide the button rather than
 * rendering a link to nowhere.
 */
export function whatsappLink(
  settings: Pick<SiteSettingsRow, 'whatsapp_number' | 'whatsapp_message'>,
  messageOverride?: string,
): WhatsAppLink | null {
  const digits = settings.whatsapp_number?.replace(/\D/g, '')
  if (!digits) return null

  const text = messageOverride ?? settings.whatsapp_message ?? ''
  const query = text ? `?text=${encodeURIComponent(text)}` : ''
  return {
    href: `https://wa.me/${digits}${query}`,
    display: `+${digits}`,
  }
}

export function formattedAddress(settings: SiteSettingsRow): string[] {
  return [
    settings.address_line1,
    settings.address_line2,
    [settings.city, settings.state].filter(Boolean).join(', ') || null,
    [settings.postal_code, settings.country].filter(Boolean).join(', ') || null,
  ].filter((line): line is string => Boolean(line?.trim()))
}
