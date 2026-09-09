/**
 * Public navigation.
 *
 * Structural routes live in code because each one is a real file in `app/`;
 * the *content* of every page they point at is CMS-managed. Adding a nav item
 * that has no route would 404, so this is the one list that should not be
 * editable from the admin.
 */
export interface NavLink {
  href: string
  label: string
  /** Shown in the mobile drawer only, as a one-line hint. */
  hint?: string
}

export const PRIMARY_NAV: NavLink[] = [
  { href: '/products', label: 'Products', hint: 'What we grow right now' },
  { href: '/recipes', label: 'Recipes', hint: 'Simple ways to cook it' },
  { href: '/farm', label: 'Our Farm', hint: 'How and where it grows' },
  { href: '/quality', label: 'Quality', hint: 'What we test and reject' },
  { href: '/about', label: 'About', hint: 'Who we are' },
]

export const FOOTER_NAV: { heading: string; links: NavLink[] }[] = [
  {
    heading: 'Shop',
    links: [
      { href: '/products', label: 'All products' },
      { href: '/recipes', label: 'Recipes' },
      { href: '/storage', label: 'How to store' },
    ],
  },
  {
    heading: 'NEYORA',
    links: [
      { href: '/about', label: 'About us' },
      { href: '/farm', label: 'Our farm' },
      { href: '/quality', label: 'Quality & growing' },
      { href: '/faq', label: 'FAQ' },
    ],
  },
  {
    heading: 'Support',
    links: [
      { href: '/contact', label: 'Contact' },
      { href: '/privacy', label: 'Privacy policy' },
      { href: '/terms', label: 'Terms & conditions' },
      { href: '/cookies', label: 'Cookie policy' },
    ],
  },
]
