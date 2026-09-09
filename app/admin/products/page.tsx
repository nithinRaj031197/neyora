import Link from 'next/link'
import { AdminBody, AdminPageHeader } from '@/components/admin/AdminShell'
import { AdminTable, type Column } from '@/components/admin/AdminTable'
import { SearchFilter } from '@/components/admin/SearchFilter'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Icon } from '@/components/ui/Icon'
import { Pagination } from '@/components/ui/Pagination'
import { RowActions } from '@/components/admin/RowActions'
import { requireAdmin } from '@/lib/auth/session'
import { listAdminProducts, type AdminProductListRow } from '@/lib/content/admin'
import { availabilityLabel } from '@/lib/content/products'
import { formatPrice, relativeTime } from '@/lib/utils/format'
import { setProductStatus, toggleProductFeatured } from '@/lib/actions/products'

export const dynamic = 'force-dynamic'

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>
}) {
  await requireAdmin('/admin/products')
  const sp = await searchParams

  const result = await listAdminProducts({
    search: sp.q,
    status: sp.status,
    page: Number(sp.page) || 1,
  })

  const columns: Column<AdminProductListRow>[] = [
    {
      key: 'name',
      header: 'Product',
      render: (row) => (
        <span className="flex flex-col gap-1">
          <span>{row.name}</span>
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[0.6875rem] text-earth-muted">/{row.slug}</span>
            {row.is_demo ? <Badge tone="golden">Demo</Badge> : null}
            {row.featured ? <Badge tone="leaf">Featured</Badge> : null}
          </span>
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'availability',
      header: 'Availability',
      secondary: true,
      render: (row) => (
        <span className="text-earth-soft">{availabilityLabel(row.availability)}</span>
      ),
    },
    {
      key: 'pack',
      header: 'Pack',
      secondary: true,
      render: (row) => <span className="text-earth-soft">{row.weight_label ?? '—'}</span>,
    },
    {
      key: 'price',
      header: 'Price',
      align: 'right',
      render: (row) => (
        <span className="text-earth tabular-nums">
          {formatPrice(row.price, row.currency) ?? '—'}
        </span>
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
        <RowActions
          id={row.id}
          status={row.status}
          featured={row.featured}
          editHref={`/admin/products/${row.id}`}
          publicHref={row.status === 'published' ? `/products/${row.slug}` : undefined}
          statusAction={setProductStatus}
          featureAction={toggleProductFeatured}
        />
      ),
    },
  ]

  return (
    <>
      <AdminPageHeader
        title="Products"
        description="Everything NEYORA sells. The schema is deliberately generic, so adding a non-mushroom product needs no code change — just a new category."
        breadcrumbs={[{ label: 'Products' }]}
        actions={
          <Link
            href="/admin/products/new"
            className="inline-flex h-11 items-center gap-2 rounded-xs border border-forest bg-forest px-4 text-[0.8125rem] font-medium tracking-[0.06em] text-ivory uppercase transition-colors hover:bg-forest-soft"
          >
            <Icon name="plus" size={15} />
            New product
          </Link>
        }
      />

      <AdminBody size="wide" className="flex flex-col gap-5">
        <SearchFilter
          basePath="/admin/products"
          placeholder="Search products"
          statuses={[
            { value: 'published', label: 'Published' },
            { value: 'draft', label: 'Draft' },
            { value: 'scheduled', label: 'Scheduled' },
          ]}
        />

        <AdminTable
          caption="All products"
          columns={columns}
          rows={result.rows}
          rowHref={(row) => `/admin/products/${row.id}`}
          empty={
            <EmptyState
              icon="leaf"
              title={sp.q || sp.status ? 'No products match' : 'No products yet'}
              description="Add what you are growing. It stays a draft until you publish it."
              actionLabel="Add a product"
              actionHref="/admin/products/new"
            />
          }
        />

        <Pagination
          page={result.page}
          pageSize={result.pageSize}
          total={result.total}
          basePath="/admin/products"
          params={{ q: sp.q, status: sp.status }}
        />
      </AdminBody>
    </>
  )
}
