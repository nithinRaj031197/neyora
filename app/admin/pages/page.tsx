import Link from 'next/link'
import { AdminBody, AdminPageHeader } from '@/components/admin/AdminShell'
import { AdminTable, type Column } from '@/components/admin/AdminTable'
import { Badge, StatusBadge, isPublicationLive } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Icon } from '@/components/ui/Icon'
import { requireAdmin } from '@/lib/auth/session'
import { listAdminPages } from '@/lib/content/admin'
import { relativeTime } from '@/lib/utils/format'
import type { PageRow } from '@/types/database'

export const dynamic = 'force-dynamic'

/** Slugs served by a route whose path differs from the slug. */
const SLUG_TO_PATH: Record<string, string> = {
  'faq-intro': '/faq',
  'contact-intro': '/contact',
}

export default async function AdminPagesPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>
}) {
  await requireAdmin('/admin/pages')
  await searchParams

  const pages = await listAdminPages()

  const columns: Column<PageRow>[] = [
    {
      key: 'title',
      header: 'Page',
      render: (row) => (
        <span className="flex flex-col gap-1">
          <span>{row.title}</span>
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[0.6875rem] text-earth-muted">
              {SLUG_TO_PATH[row.slug] ?? `/${row.slug}`}
            </span>
            {row.is_system ? <Badge tone="outline">Fixed URL</Badge> : null}
            {row.is_demo ? <Badge tone="golden">Demo copy</Badge> : null}
          </span>
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <StatusBadge
          status={row.status}
          isLive={isPublicationLive(row.status, row.scheduled_at)}
        />
      ),
    },
    {
      key: 'noindex',
      header: 'Indexing',
      secondary: true,
      render: (row) =>
        row.noindex ? (
          <Badge tone="warning">Hidden from search</Badge>
        ) : (
          <span className="text-earth-muted">Indexed</span>
        ),
    },
    {
      key: 'updated',
      header: 'Updated',
      secondary: true,
      render: (row) => <span className="text-earth-muted">{relativeTime(row.updated_at)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          {row.status === 'published' ? (
            <Link
              href={SLUG_TO_PATH[row.slug] ?? `/${row.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`View ${row.title}`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xs border border-beige text-earth-muted transition-colors hover:border-forest/50 hover:text-forest"
            >
              <Icon name="external" size={14} />
            </Link>
          ) : null}
          <Link
            href={`/admin/pages/${row.id}`}
            className="inline-flex h-9 items-center rounded-xs border border-beige px-3 text-[0.75rem] font-medium tracking-[0.04em] text-earth-soft uppercase transition-colors hover:border-forest/50 hover:text-forest"
          >
            Edit
          </Link>
        </div>
      ),
    },
  ]

  return (
    <>
      <AdminPageHeader
        title="Pages"
        description="The editorial pages of the site. Pages marked “Fixed URL” are wired to a route in the application — you can rewrite them freely, but their slug cannot change and they cannot be deleted."
        breadcrumbs={[{ label: 'Pages' }]}
        actions={
          <Link
            href="/admin/pages/new"
            className="inline-flex h-11 items-center gap-2 rounded-xs border border-forest bg-forest px-4 text-[0.8125rem] font-medium tracking-[0.06em] text-ivory uppercase transition-colors hover:bg-forest-soft"
          >
            <Icon name="plus" size={15} />
            New page
          </Link>
        }
      />

      <AdminBody size="wide">
        <AdminTable
          caption="All pages"
          columns={columns}
          rows={pages}
          rowHref={(row) => `/admin/pages/${row.id}`}
          empty={
            <EmptyState
              icon="link"
              title="No pages"
              description="Run the database migrations to seed the structural pages (/about, /farm, /quality and the rest)."
            />
          }
        />
      </AdminBody>
    </>
  )
}
