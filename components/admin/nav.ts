import type { AdminRole } from '@/types/database'
import type { IconName } from '@/components/ui/Icon'

export interface AdminNavItem {
  href: string
  label: string
  icon: IconName
  /** Minimum role required. Items above the user's role are not rendered. */
  minRole?: AdminRole
  /** Highlights the parent when a child route is active. */
  matchPrefix?: boolean
}

export interface AdminNavGroup {
  heading: string
  items: AdminNavItem[]
}

/**
 * Admin navigation.
 *
 * Grouped by what an editor is trying to do, not by table name — "Content",
 * "Site", "Inbox", "System" — because that is how someone updating a headline
 * thinks about it.
 */
export const ADMIN_NAV: AdminNavGroup[] = [
  {
    heading: 'Overview',
    items: [{ href: '/admin', label: 'Dashboard', icon: 'qr' }],
  },
  {
    heading: 'Content',
    items: [
      { href: '/admin/recipes', label: 'Recipes', icon: 'flame', matchPrefix: true },
      { href: '/admin/products', label: 'Products', icon: 'leaf', matchPrefix: true },
      { href: '/admin/categories', label: 'Categories', icon: 'chevron-right', matchPrefix: true },
      { href: '/admin/pages', label: 'Pages', icon: 'link', matchPrefix: true },
      { href: '/admin/homepage', label: 'Homepage', icon: 'image' },
      { href: '/admin/faqs', label: 'FAQs', icon: 'alert', matchPrefix: true },
      { href: '/admin/testimonials', label: 'Testimonials', icon: 'users', matchPrefix: true },
      { href: '/admin/media', label: 'Media library', icon: 'image', matchPrefix: true },
    ],
  },
  {
    heading: 'Site',
    items: [
      { href: '/admin/seo', label: 'SEO', icon: 'search' },
      { href: '/admin/redirects', label: 'QR redirects', icon: 'qr', matchPrefix: true },
      { href: '/admin/social', label: 'Social links', icon: 'instagram' },
      { href: '/admin/settings', label: 'Site settings', icon: 'phone', minRole: 'admin' },
    ],
  },
  {
    heading: 'Inbox',
    items: [{ href: '/admin/messages', label: 'Messages', icon: 'mail', matchPrefix: true }],
  },
  {
    heading: 'System',
    items: [{ href: '/admin/users', label: 'Users & admins', icon: 'users', minRole: 'admin' }],
  },
]

const RANK: Record<AdminRole, number> = { editor: 1, admin: 2, owner: 3 }

export function visibleNav(role: AdminRole): AdminNavGroup[] {
  return ADMIN_NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.minRole || RANK[role] >= RANK[item.minRole]),
  })).filter((group) => group.items.length > 0)
}
