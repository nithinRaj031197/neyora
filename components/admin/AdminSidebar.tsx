'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/utils/cn'
import { visibleNav } from './nav'
import type { AdminRole } from '@/types/database'

/**
 * Admin sidebar.
 *
 * Visually a different system from the public site — dark, dense, neutral, no
 * display serif and no marketing spacing — as the brief requires. It reads as
 * a tool, and that difference is itself a safety feature: you always know
 * whether you are looking at the live site or the CMS.
 */
export function AdminSidebar({
  role,
  email,
  fullName,
  brandName,
}: {
  role: AdminRole
  email: string
  fullName: string | null
  brandName: string
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const groups = visibleNav(role)

  const isActive = (href: string, matchPrefix?: boolean) =>
    matchPrefix ? pathname === href || pathname.startsWith(`${href}/`) : pathname === href

  return (
    <>
      {/* Mobile bar */}
      <div className="flex items-center justify-between border-b border-earth-soft/40 bg-earth px-4 py-3 lg:hidden">
        <Link href="/admin" className="font-display text-lg text-ivory">
          {brandName} <span className="text-leaf">CMS</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="admin-nav"
          className="inline-flex h-10 items-center gap-2 rounded-xs border border-ivory/25 px-3 text-[0.8125rem] text-ivory"
        >
          Menu
          <Icon name="chevron-down" size={14} className={cn(open && 'rotate-180')} />
        </button>
      </div>

      <aside
        id="admin-nav"
        className={cn(
          'flex-col border-r border-earth-soft/40 bg-earth lg:flex lg:w-64 lg:shrink-0',
          open ? 'flex' : 'hidden',
        )}
      >
        <div className="hidden px-5 py-6 lg:block">
          <Link href="/admin" className="font-display text-xl text-ivory">
            {brandName} <span className="text-leaf">CMS</span>
          </Link>
          <p className="mt-1 text-[0.6875rem] tracking-[0.14em] text-ivory/40 uppercase">
            Content management
          </p>
        </div>

        <nav aria-label="Admin sections" className="flex-1 overflow-y-auto px-3 pb-6 lg:px-3">
          {groups.map((group) => (
            <div key={group.heading} className="mt-5 first:mt-3">
              <h2 className="px-2 text-[0.625rem] font-semibold tracking-[0.16em] text-ivory/35 uppercase">
                {group.heading}
              </h2>
              <ul className="mt-2 flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.href, item.matchPrefix)
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        onClick={() => setOpen(false)}
                        className={cn(
                          'flex items-center gap-2.5 rounded-xs px-2.5 py-2 text-[0.8125rem] transition-colors',
                          active
                            ? 'bg-ivory/12 text-ivory'
                            : 'text-ivory/60 hover:bg-ivory/6 hover:text-ivory',
                        )}
                      >
                        <Icon name={item.icon} size={16} className={active ? 'text-leaf' : ''} />
                        {item.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-ivory/12 px-4 py-4">
          <p className="truncate text-[0.8125rem] text-ivory/85">{fullName || email}</p>
          <p className="mt-0.5 text-[0.6875rem] tracking-[0.12em] text-ivory/40 uppercase">
            {role}
          </p>
          <div className="mt-3 flex flex-col gap-1.5">
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[0.75rem] text-ivory/55 transition-colors hover:text-ivory"
            >
              <Icon name="external" size={13} />
              View live site
            </Link>
            <form action="/admin/auth/sign-out" method="post">
              <button
                type="submit"
                className="text-[0.75rem] text-ivory/55 transition-colors hover:text-ivory"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  )
}
