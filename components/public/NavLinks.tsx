'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { NavLink } from './nav-links'
import { cn } from '@/lib/utils/cn'

/**
 * Desktop nav. A client component only because the active item needs the
 * current pathname — `aria-current="page"` is a real accessibility
 * requirement, not decoration.
 */
export function NavLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname()

  return (
    <nav aria-label="Main navigation" className="hidden lg:block">
      <ul className="flex items-center gap-1">
        {links.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`)
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative inline-flex h-10 items-center rounded-xs px-3.5',
                  'text-[0.8125rem] font-medium tracking-[0.08em] uppercase',
                  'transition-colors duration-200',
                  active ? 'text-botanical' : 'text-earth-soft hover:text-forest',
                )}
              >
                {link.label}
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-3.5 bottom-1.5 h-px bg-leaf"
                  />
                ) : null}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
