export interface RetailerConfig {
  id: string
  label: string
  enabled: boolean
  note: string
}

export const RETAILERS: RetailerConfig[] = [
  {
    id: 'blinkit',
    label: 'Blinkit',
    enabled: false,
    note: 'Retailer search integration is not enabled yet.',
  },
  {
    id: 'zepto',
    label: 'Zepto',
    enabled: false,
    note: 'Retailer search integration is not enabled yet.',
  },
  {
    id: 'swiggy-instamart',
    label: 'Swiggy Instamart',
    enabled: false,
    note: 'Retailer search integration is not enabled yet.',
  },
]

export function ingredientShoppingQuery(item: {
  shoppingQuery?: string
  item: string
  optional?: boolean
}): string {
  return item.shoppingQuery?.trim() || item.item
}

export function shoppingSearchUrl(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`
}
