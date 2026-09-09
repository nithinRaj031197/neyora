/**
 * Display formatting. All of it locale-explicit so server and client render
 * identical strings and React never reports a hydration mismatch.
 */

export function formatPrice(
  amount: number | null,
  currency = 'INR',
  locale = 'en-IN',
): string | null {
  if (amount === null || Number.isNaN(amount)) return null
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount)
  } catch {
    return `${currency} ${amount}`
  }
}

/** "1 hr 25 min", "45 min", "—". */
export function formatDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || minutes <= 0) return '—'
  if (minutes < 60) return `${minutes} min`
  const hrs = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins === 0 ? `${hrs} hr` : `${hrs} hr ${mins} min`
}

/** ISO 8601 duration for Recipe JSON-LD. */
export function isoDuration(minutes: number | null | undefined): string | undefined {
  if (!minutes || minutes <= 0) return undefined
  const hrs = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `PT${hrs > 0 ? `${hrs}H` : ''}${mins > 0 ? `${mins}M` : ''}`
}

export function formatDate(iso: string | null | undefined, locale = 'en-GB'): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d)
}

export function formatDateTime(iso: string | null | undefined, locale = 'en-GB'): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(d)
}

/** Value for an <input type="datetime-local">, in UTC. */
export function toDateTimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 16)
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`
  return `${(kb / 1024).toFixed(2)} MB`
}

/**
 * Renders 1.5 as "1½" and 0.25 as "¼".
 *
 * Cooks read fractions faster than decimals, and this is the difference
 * between an ingredient list that feels written and one that feels computed.
 */
const VULGAR: Record<string, string> = {
  '0.125': '⅛', '0.25': '¼', '0.333': '⅓', '0.375': '⅜',
  '0.5': '½', '0.625': '⅝', '0.666': '⅔', '0.667': '⅔',
  '0.75': '¾', '0.875': '⅞',
}

export function formatQuantity(qty: number | null): string {
  if (qty === null || Number.isNaN(qty)) return ''
  if (Number.isInteger(qty)) return String(qty)

  const whole = Math.floor(qty)
  const frac = qty - whole
  const key = frac.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')
  const vulgar = VULGAR[key] ?? VULGAR[frac.toFixed(2)] ?? VULGAR[String(frac)]

  if (vulgar) return whole > 0 ? `${whole}${vulgar}` : vulgar
  // Not a familiar fraction — one decimal reads better than three.
  return String(Math.round(qty * 10) / 10)
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural
}

export function relativeTime(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return '—'
  const diff = Math.round((then - now) / 1000)
  const abs = Math.abs(diff)
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  if (abs < 60) return rtf.format(Math.round(diff), 'second')
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute')
  if (abs < 86_400) return rtf.format(Math.round(diff / 3600), 'hour')
  if (abs < 2_592_000) return rtf.format(Math.round(diff / 86_400), 'day')
  if (abs < 31_536_000) return rtf.format(Math.round(diff / 2_592_000), 'month')
  return rtf.format(Math.round(diff / 31_536_000), 'year')
}
