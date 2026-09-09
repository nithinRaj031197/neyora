'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { NavLink } from './nav-links'
import { cn } from '@/lib/utils/cn'

/**
 * Mobile navigation drawer.
 *
 * One of the few client components on the public site. It exists rather than a
 * CSS-only `<details>` toggle because a real menu needs Escape to close,
 * focus returned to the trigger, and the background locked from scrolling —
 * none of which CSS can do.
 */
export function MobileNav({
  links,
  whatsappHref,
  brandName,
}: {
  links: NavLink[]
  whatsappHref: string | null
  brandName: string
}) {
  const pathname = usePathname()
  const panelId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)

  /*
   * The drawer stores *which page* it was opened on, rather than a boolean.
   *
   * Navigating therefore closes it automatically — the stored path no longer
   * matches — without an effect that fires setState on every route change.
   */
  const [openedOn, setOpenedOn] = useState<string | null>(null)
  const open = openedOn === pathname

  const setOpen = (next: boolean) => setOpenedOn(next ? pathname : null)

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // setOpenedOn rather than the setOpen wrapper: a state setter is
        // stable across renders, so the effect needs no extra dependency.
        setOpenedOn(null)
        triggerRef.current?.focus()
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? 'Close menu' : 'Open menu'}
        className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-xs text-forest transition-colors hover:bg-forest/5 lg:hidden"
      >
        <span className="relative block h-3.5 w-5" aria-hidden="true">
          <span
            className={cn(
              'absolute left-0 block h-px w-5 bg-current transition-transform duration-300 ease-(--ease-out-soft)',
              open ? 'top-1.5 rotate-45' : 'top-0',
            )}
          />
          <span
            className={cn(
              'absolute top-1.5 left-0 block h-px w-5 bg-current transition-opacity duration-200',
              open ? 'opacity-0' : 'opacity-100',
            )}
          />
          <span
            className={cn(
              'absolute left-0 block h-px w-5 bg-current transition-transform duration-300 ease-(--ease-out-soft)',
              open ? 'top-1.5 -rotate-45' : 'top-3',
            )}
          />
        </span>
      </button>

      <div
        id={panelId}
        hidden={!open}
        className="fixed inset-x-0 top-[var(--nav-height,4.25rem)] bottom-0 z-40 overflow-y-auto border-t border-beige bg-ivory lg:hidden"
      >
        <nav aria-label={`${brandName} main navigation`} className="px-5 py-6">
          <ul className="flex flex-col">
            {links.map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`)
              return (
                <li key={link.href} className="border-b border-beige/70 last:border-b-0">
                  <Link
                    href={link.href}
                    aria-current={active ? 'page' : undefined}
                    className="flex flex-col gap-0.5 py-4"
                  >
                    <span
                      className={cn(
                        'font-display text-2xl',
                        active ? 'text-botanical' : 'text-forest',
                      )}
                    >
                      {link.label}
                    </span>
                    {link.hint ? (
                      <span className="text-[0.8125rem] text-earth-muted">{link.hint}</span>
                    ) : null}
                  </Link>
                </li>
              )
            })}
          </ul>

          <div className="mt-8 flex flex-col gap-3">
            <Link
              href="/contact"
              className="inline-flex h-12 items-center justify-center rounded-xs border border-forest bg-forest text-[0.875rem] font-medium tracking-[0.04em] text-ivory uppercase"
            >
              Contact us
            </Link>
            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center justify-center rounded-xs border border-forest/35 text-[0.875rem] font-medium tracking-[0.04em] text-forest uppercase"
              >
                Message on WhatsApp
              </a>
            ) : null}
          </div>
        </nav>
      </div>
    </>
  )
}
