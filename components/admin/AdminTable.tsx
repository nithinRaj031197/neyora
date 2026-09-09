import Link from 'next/link'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

export interface Column<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  className?: string
  /** Hidden below `lg`, so the mobile table stays readable. */
  secondary?: boolean
  align?: 'left' | 'right'
}

/**
 * The admin list table.
 *
 * A real <table> with a <caption>, scope="col" headers and one scroll
 * container, rather than a grid of divs — screen readers announce row and
 * column position from the semantics, and it is fewer lines of code.
 *
 * Columns marked `secondary` disappear on small screens so the table degrades
 * instead of becoming a horizontal-scrolling wall on a phone.
 */
export function AdminTable<T extends { id: string }>({
  caption,
  columns,
  rows,
  rowHref,
  empty,
}: {
  caption: string
  columns: Column<T>[]
  rows: T[]
  rowHref?: (row: T) => string
  empty: ReactNode
}) {
  if (rows.length === 0) return <>{empty}</>

  return (
    <div className="overflow-x-auto rounded-sm border border-beige">
      <table className="w-full min-w-full text-[0.875rem]">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-ivory-soft">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  'px-4 py-3 text-[0.6875rem] font-semibold tracking-[0.12em] text-earth-muted uppercase',
                  column.align === 'right' ? 'text-right' : 'text-left',
                  column.secondary && 'hidden lg:table-cell',
                  column.className,
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-t border-beige/80 transition-colors hover:bg-ivory-soft/60"
            >
              {columns.map((column, index) => {
                const content = column.render(row)
                const href = rowHref?.(row)
                return (
                  <td
                    key={column.key}
                    className={cn(
                      'px-4 py-3 align-top',
                      column.align === 'right' ? 'text-right' : 'text-left',
                      column.secondary && 'hidden lg:table-cell',
                      column.className,
                    )}
                  >
                    {/* Only the first cell links, so action buttons in later
                        cells are not swallowed by a row-wide anchor. */}
                    {index === 0 && href ? (
                      <Link href={href} className="block font-medium text-forest hover:underline">
                        {content}
                      </Link>
                    ) : (
                      content
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
