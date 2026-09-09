import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'

export interface Crumb {
  name: string
  path: string
}

/** Visual breadcrumbs. The matching JSON-LD is emitted separately by the page. */
export function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  if (trail.length <= 1) return null

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-[0.8125rem] text-earth-muted">
        {trail.map((crumb, index) => {
          const isLast = index === trail.length - 1
          return (
            <li key={crumb.path} className="flex items-center gap-1.5">
              {isLast ? (
                <span aria-current="page" className="text-earth-soft">
                  {crumb.name}
                </span>
              ) : (
                <>
                  <Link href={crumb.path} className="transition-colors hover:text-forest">
                    {crumb.name}
                  </Link>
                  <Icon name="chevron-right" size={13} aria-hidden />
                </>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
