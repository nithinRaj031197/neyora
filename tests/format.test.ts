import { describe, expect, it } from 'vitest'
import {
  formatBytes,
  formatDuration,
  formatPrice,
  formatQuantity,
  isoDuration,
  pluralize,
  relativeTime,
  toDateTimeLocalValue,
} from '@/lib/utils/format'
import { whatsappLink, formattedAddress, FALLBACK_SETTINGS } from '@/lib/content/site'
import { isSafeDestination } from '@/lib/content/redirects'

describe('formatQuantity', () => {
  it('keeps whole numbers whole', () => {
    expect(formatQuantity(3)).toBe('3')
    expect(formatQuantity(200)).toBe('200')
  })

  // Cooks read fractions faster than decimals; this is what makes a scaled
  // ingredient list still feel written rather than computed.
  it.each([
    [0.25, '¼'],
    [0.5, '½'],
    [0.75, '¾'],
    [0.125, '⅛'],
    [1 / 3, '⅓'],
    [2 / 3, '⅔'],
  ])('renders %s as %s', (input, expected) => {
    expect(formatQuantity(input)).toBe(expected)
  })

  it('combines a whole number with a fraction', () => {
    expect(formatQuantity(1.5)).toBe('1½')
    expect(formatQuantity(2.25)).toBe('2¼')
  })

  it('falls back to one decimal for an unfamiliar fraction', () => {
    expect(formatQuantity(1.7)).toBe('1.7')
  })

  it('renders nothing for an unmeasured ingredient', () => {
    expect(formatQuantity(null)).toBe('')
  })
})

describe('formatDuration', () => {
  it.each([
    [10, '10 min'],
    [59, '59 min'],
    [60, '1 hr'],
    [85, '1 hr 25 min'],
    [120, '2 hr'],
  ])('formats %i minutes as %s', (input, expected) => {
    expect(formatDuration(input)).toBe(expected)
  })

  it.each([null, undefined, 0])('renders an em dash for %s', (input) => {
    expect(formatDuration(input)).toBe('—')
  })
})

describe('isoDuration', () => {
  it('produces schema.org durations', () => {
    expect(isoDuration(10)).toBe('PT10M')
    expect(isoDuration(60)).toBe('PT1H')
    expect(isoDuration(85)).toBe('PT1H25M')
  })

  it('omits the field entirely when there is no time', () => {
    expect(isoDuration(0)).toBeUndefined()
    expect(isoDuration(null)).toBeUndefined()
  })
})

describe('formatPrice', () => {
  it('formats rupees without stray decimals on a whole amount', () => {
    expect(formatPrice(120, 'INR')).toContain('120')
  })

  it('returns null when there is no price, so callers can omit the element', () => {
    expect(formatPrice(null)).toBeNull()
  })

  it('degrades gracefully for an unknown currency code', () => {
    expect(formatPrice(10, 'ZZZ')).toContain('10')
  })
})

describe('formatBytes', () => {
  it.each([
    [500, '500 B'],
    [2048, '2.0 KB'],
    [1024 * 1024 * 2, '2.00 MB'],
  ])('formats %i as %s', (input, expected) => {
    expect(formatBytes(input)).toBe(expected)
  })

  it('renders an em dash for nothing', () => {
    expect(formatBytes(null)).toBe('—')
  })
})

describe('toDateTimeLocalValue', () => {
  it('produces a value an <input type="datetime-local"> accepts', () => {
    expect(toDateTimeLocalValue('2026-03-01T09:30:00.000Z')).toBe('2026-03-01T09:30')
  })

  it('returns an empty string for nothing', () => {
    expect(toDateTimeLocalValue(null)).toBe('')
    expect(toDateTimeLocalValue('not a date')).toBe('')
  })
})

describe('relativeTime', () => {
  const now = new Date('2026-06-15T12:00:00Z').getTime()

  it('describes the recent past', () => {
    expect(relativeTime('2026-06-15T11:30:00Z', now)).toContain('30 minutes ago')
  })

  it('describes days', () => {
    expect(relativeTime('2026-06-12T12:00:00Z', now)).toContain('3 days ago')
  })

  it('handles nothing', () => {
    expect(relativeTime(null, now)).toBe('—')
  })
})

describe('pluralize', () => {
  it('picks the right form', () => {
    expect(pluralize(1, 'recipe')).toBe('recipe')
    expect(pluralize(2, 'recipe')).toBe('recipes')
  })
})

describe('whatsappLink', () => {
  it('builds a wa.me link with a pre-filled message', () => {
    const link = whatsappLink({ whatsapp_number: '919876543210', whatsapp_message: 'Hi there' })
    expect(link?.href).toBe('https://wa.me/919876543210?text=Hi%20there')
    expect(link?.display).toBe('+919876543210')
  })

  it('strips any stray formatting from the stored number', () => {
    const link = whatsappLink({ whatsapp_number: '+91 98765-43210', whatsapp_message: null })
    expect(link?.href).toBe('https://wa.me/919876543210')
  })

  it('allows the message to be overridden per context', () => {
    const link = whatsappLink(
      { whatsapp_number: '919876543210', whatsapp_message: 'default' },
      'About Fresh Oyster Mushrooms',
    )
    expect(link?.href).toContain('About%20Fresh%20Oyster%20Mushrooms')
  })

  // Callers hide the button entirely rather than link to nowhere.
  it('returns null when no number is configured', () => {
    expect(whatsappLink({ whatsapp_number: null, whatsapp_message: null })).toBeNull()
    expect(whatsappLink({ whatsapp_number: '', whatsapp_message: null })).toBeNull()
  })
})

describe('formattedAddress', () => {
  it('drops empty lines instead of leaving blank rows', () => {
    const lines = formattedAddress({
      ...FALLBACK_SETTINGS,
      address_line1: 'The Farm',
      address_line2: null,
      city: 'Bengaluru',
      state: 'Karnataka',
      postal_code: '560001',
      country: 'India',
    })
    expect(lines).toEqual(['The Farm', 'Bengaluru, Karnataka', '560001, India'])
  })

  it('returns nothing when no address is set', () => {
    expect(formattedAddress(FALLBACK_SETTINGS)).toEqual([])
  })
})

describe('isSafeDestination', () => {
  it('accepts a same-origin path', () => {
    expect(isSafeDestination('/recipes')).toBe(true)
  })

  it('accepts a nested path with a query string', () => {
    expect(isSafeDestination('/recipes/category/quick?sort=new')).toBe(true)
  })

  // Defence in depth behind the database CHECK constraint: a QR redirect must
  // never be able to send a customer off-site.
  it.each([
    '//evil.example.com',
    'https://evil.example.com',
    'recipes',
    'javascript:alert(1)',
    '/\\evil.example.com',
    '/recipes\nLocation: https://evil.example.com',
    '/recipes\u0000',
  ])('rejects %j', (destination) => {
    expect(isSafeDestination(destination)).toBe(false)
  })
})
