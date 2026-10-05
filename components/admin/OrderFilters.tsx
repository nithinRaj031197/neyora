'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { ORDER_STATUSES, PAYMENT_STATUSES, STATUS_LABELS } from '@/lib/orders/schema'
import { cn } from '@/lib/utils/cn'
import { Icon } from '@/components/ui/Icon'

/**
 * Filters, in the URL.
 *
 * Every filter is a query parameter, so the page can stay a server component
 * that re-queries MongoDB — nothing is filtered in the browser, and the
 * browser never holds more than the page it is showing. It also means a
 * filtered view is a link: shareable, bookmarkable, and survives a refresh.
 *
 * Search covers the order reference and the phone number — what an admin
 * actually has in front of them when a customer calls. Not free-text name
 * search: that cannot use an index, and a collection scan on every keystroke
 * is a bill that arrives later.
 */
export function OrderFilters({
  status,
  paymentStatus,
  search,
}: {
  status?: string
  paymentStatus?: string
  search?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [term, setTerm] = useState(search ?? '')

  const apply = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params.toString())
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    router.push(next.size > 0 ? `${pathname}?${next}` : pathname)
  }

  const chip = (active: boolean) =>
    cn(
      'press inline-flex h-9 items-center rounded-xs border px-3 text-[0.8125rem] transition-colors duration-200 ease-(--ease-out-soft)',
      active
        ? 'border-forest bg-forest text-ivory'
        : 'border-beige text-earth-soft hover:border-forest/50 hover:text-forest',
    )

  return (
    <div className="mt-6 grid gap-3">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          apply({ q: term.trim() || undefined })
        }}
        className="flex gap-2"
        role="search"
      >
        <label htmlFor="order-search" className="sr-only">
          Search by order reference or phone number
        </label>
        <input
          id="order-search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          type="search"
          inputMode="search"
          enterKeyHint="search"
          placeholder="Order reference or phone"
          className="h-10 w-full max-w-[22rem] rounded-xs border border-beige bg-ivory px-3.5 text-[0.9375rem] text-earth placeholder:text-earth-muted/60 focus-visible:border-leaf focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-leaf"
        />
        <button type="submit" aria-label="Search" className={chip(false)}>
          <Icon name="search" size={16} />
        </button>
        {search ? (
          <button
            type="button"
            onClick={() => {
              setTerm('')
              apply({ q: undefined })
            }}
            className={chip(false)}
          >
            Clear
          </button>
        ) : null}
      </form>

      <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
        <button type="button" onClick={() => apply({ status: undefined })} className={chip(!status)}>
          All
        </button>
        {ORDER_STATUSES.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => apply({ status: status === value ? undefined : value })}
            aria-pressed={status === value}
            className={chip(status === value)}
          >
            {STATUS_LABELS[value]}
          </button>
        ))}
      </nav>

      <nav aria-label="Filter by payment" className="flex flex-wrap gap-2">
        {PAYMENT_STATUSES.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => apply({ payment: paymentStatus === value ? undefined : value })}
            aria-pressed={paymentStatus === value}
            className={chip(paymentStatus === value)}
          >
            {value === 'paid' ? '🟢 Paid' : '🟠 Unpaid'}
          </button>
        ))}
      </nav>
    </div>
  )
}
