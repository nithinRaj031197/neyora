'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon, type IconName } from '@/components/ui/Icon'
import { cn } from '@/lib/utils/cn'

/**
 * Admin navigation.
 *
 * A client component for one reason only: the current route. `aria-current`
 * has to be real, not decorative — it is what tells a screen reader which of
 * three identical-sounding links you are already on.
 *
 * Two variants rather than one responsive component, because the phone layout
 * is a *fixed* bottom bar and the header above it has `backdrop-filter`, which
 * makes that header a containing block for fixed descendants. A single node
 * living inside the header could not escape it. The desktop rail and the
 * mobile bar are therefore rendered as separate nodes, each hidden at the
 * other's breakpoint.
 *
 * Bottom placement on a handset is deliberate: the top-left corner is the
 * hardest point to reach one-handed, and this is a tool someone uses standing
 * up in a growing room.
 */

const LINKS: { href: string; label: string; icon: IconName }[] = [
  { href: '/admin', label: 'Orders', icon: 'clock' },
  { href: '/admin/products', label: 'Products', icon: 'leaf' },
  { href: '/admin/settings', label: 'Settings', icon: 'phone' },
]

export function AdminNav({ variant = 'rail' }: { variant?: 'rail' | 'bar' }) {
  const pathname = usePathname()
  const bar = variant === 'bar'

  return (
    <nav
      aria-label="Admin sections"
      className={cn(
        bar
          ? 'fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-beige bg-ivory/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md'
          : 'flex items-center gap-1',
      )}
    >
      {LINKS.map((link) => {
        // `/admin` is the orders list, so it must match exactly — otherwise it
        // would claim to be current on every page beneath it.
        const active =
          link.href === '/admin' ? pathname === '/admin' : pathname.startsWith(link.href)

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'press transition-colors duration-200 ease-(--ease-out-soft)',
              bar
                ? 'flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[0.6875rem] tracking-[0.08em] uppercase'
                : 'flex h-9 items-center rounded-xs px-3 text-[0.875rem]',
              active
                ? cn('text-forest', !bar && 'bg-forest/8 font-medium')
                : cn('text-earth-muted hover:text-forest', !bar && 'hover:bg-earth/5'),
            )}
          >
            {bar ? <Icon name={link.icon} size={18} /> : null}
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
