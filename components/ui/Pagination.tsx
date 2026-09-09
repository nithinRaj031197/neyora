import Link from 'next/link'
import { Icon } from './Icon'

/**
 * Pagination.
 *
 * Real <a> links, not buttons, so a crawler can follow them and a reader can
 * open page 3 in a new tab. Preserves whatever filters are already in the URL.
 */
export function Pagination({
  page,
  pageSize,
  total,
  basePath,
  params = {},
}: {
  page: number
  pageSize: number
  total: number
  basePath: string
  params?: Record<string, string | undefined>
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (totalPages <= 1) return null

  const href = (target: number) => {
    const search = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (value) search.set(key, value)
    }
    if (target > 1) search.set('page', String(target))
    const qs = search.toString()
    return qs ? `${basePath}?${qs}` : basePath
  }

  const linkClass =
    'inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-xs border border-beige px-3 text-[0.8125rem] font-medium text-earth-soft transition-colors hover:border-forest/50 hover:text-forest'

  return (
    <nav aria-label="Pagination" className="mt-16 flex items-center justify-between gap-4">
      {page > 1 ? (
        <Link href={href(page - 1)} rel="prev" className={linkClass}>
          <Icon name="chevron-right" size={14} className="rotate-180" />
          Previous
        </Link>
      ) : (
        <span aria-hidden="true" />
      )}

      <p className="text-[0.8125rem] text-earth-muted">
        Page {page} of {totalPages}
      </p>

      {page < totalPages ? (
        <Link href={href(page + 1)} rel="next" className={linkClass}>
          Next
          <Icon name="chevron-right" size={14} />
        </Link>
      ) : (
        <span aria-hidden="true" />
      )}
    </nav>
  )
}
