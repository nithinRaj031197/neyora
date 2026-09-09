import Link from 'next/link'
import type { ReactNode } from 'react'
import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/utils/cn'

export interface AdminCrumb {
  label: string
  href?: string
}

/**
 * Page chrome for every admin screen: breadcrumbs, title, description and a
 * slot for actions. One component so every screen has the same anatomy.
 */
export function AdminPageHeader({
  title,
  description,
  breadcrumbs = [],
  actions,
}: {
  title: string
  description?: string
  breadcrumbs?: AdminCrumb[]
  actions?: ReactNode
}) {
  return (
    <header className="border-b border-beige bg-ivory px-5 py-6 lg:px-8 lg:py-7">
      {breadcrumbs.length > 0 ? (
        <nav aria-label="Breadcrumb" className="mb-3">
          <ol className="flex flex-wrap items-center gap-1.5 text-[0.75rem] text-earth-muted">
            <li>
              <Link href="/admin" className="transition-colors hover:text-forest">
                Admin
              </Link>
            </li>
            {breadcrumbs.map((crumb) => (
              <li key={crumb.label} className="flex items-center gap-1.5">
                <Icon name="chevron-right" size={12} />
                {crumb.href ? (
                  <Link href={crumb.href} className="transition-colors hover:text-forest">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-earth-soft">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[1.75rem] leading-tight text-forest">{title}</h1>
          {description ? (
            <p className="mt-2 max-w-[70ch] text-[0.875rem] leading-relaxed text-earth-soft">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  )
}

export function AdminBody({
  children,
  className,
  size = 'default',
}: {
  children: ReactNode
  className?: string
  size?: 'default' | 'wide' | 'narrow'
}) {
  const max = { narrow: 'max-w-3xl', default: 'max-w-5xl', wide: 'max-w-none' }[size]
  return (
    <div className={cn('px-5 py-7 lg:px-8 lg:py-8', max, className)}>{children}</div>
  )
}

/** A bordered panel. Used for form sections and dashboard cards. */
export function AdminPanel({
  title,
  description,
  children,
  actions,
  className,
  id,
}: {
  title?: string
  description?: string
  children: ReactNode
  actions?: ReactNode
  className?: string
  id?: string
}) {
  return (
    <section id={id} className={cn('rounded-sm border border-beige bg-ivory', className)}>
      {title ? (
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-beige px-5 py-4">
          <div>
            <h2 className="font-sans text-[0.9375rem] font-semibold text-forest">{title}</h2>
            {description ? (
              <p className="mt-1 max-w-[72ch] text-[0.8125rem] leading-relaxed text-earth-muted">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className="px-5 py-5">{children}</div>
    </section>
  )
}
