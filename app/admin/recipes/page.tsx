import Link from 'next/link'
import { AdminBody, AdminPageHeader } from '@/components/admin/AdminShell'
import { AdminTable, type Column } from '@/components/admin/AdminTable'
import { SearchFilter } from '@/components/admin/SearchFilter'
import { StatusBadge, Badge, isPublicationLive } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Icon } from '@/components/ui/Icon'
import { Pagination } from '@/components/ui/Pagination'
import { RowActions } from '@/components/admin/RowActions'
import { requireAdmin } from '@/lib/auth/session'
import { listAdminRecipes, type AdminRecipeListRow } from '@/lib/content/admin'
import { relativeTime } from '@/lib/utils/format'
import { setRecipeStatus, toggleRecipeFeatured, duplicateRecipe } from '@/lib/actions/recipes'

export const dynamic = 'force-dynamic'

export default async function AdminRecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>
}) {
  await requireAdmin('/admin/recipes')
  const sp = await searchParams

  const result = await listAdminRecipes({
    search: sp.q,
    status: sp.status,
    page: Number(sp.page) || 1,
  })

  const columns: Column<AdminRecipeListRow>[] = [
    {
      key: 'title',
      header: 'Recipe',
      render: (row) => (
        <span className="flex flex-col gap-1">
          <span>{row.title}</span>
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
      render: (row) => <StatusBadge
            status={row.status}
            isLive={isPublicationLive(row.status, row.scheduled_at)}
          />,
    },
    {
      key: 'category',
      header: 'Category',
      secondary: true,
      render: (row) => (
        <span className="text-earth-soft">{row.category?.name ?? '—'}</span>
      ),
    },
    {
      key: 'pack',
      header: 'Pack',
      secondary: true,
      render: (row) => <span className="text-earth-soft">{row.recommended_pack_size}</span>,
    },
    {
      key: 'views',
      header: 'Views',
      secondary: true,
      align: 'right',
      render: (row) => (
        <span className="text-earth-soft tabular-nums">{row.view_count.toLocaleString('en-GB')}</span>
      ),
    },
    {
      key: 'updated',
      header: 'Updated',
      secondary: true,
      render: (row) => (
        <span className="text-earth-muted">{relativeTime(row.updated_at)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <RowActions
          editHref={`/admin/recipes/${row.id}`}
          publicHref={row.status === 'published' ? `/recipes/${row.slug}` : undefined}
          previewHref={`/admin/recipes/${row.id}/preview`}
          statusAction={setRecipeStatus}
          featureAction={toggleRecipeFeatured}
          duplicateAction={duplicateRecipe}
          id={row.id}
          status={row.status}
          featured={row.featured}
        />
      ),
    },
  ]

  return (
    <>
      <AdminPageHeader
        title="Recipes"
        description="Create, edit, schedule and publish recipes. Everything here is driven by the database — no code changes needed."
        breadcrumbs={[{ label: 'Recipes' }]}
        actions={
          <Link
            href="/admin/recipes/new"
            className="inline-flex h-11 items-center gap-2 rounded-xs border border-forest bg-forest px-4 text-[0.8125rem] font-medium tracking-[0.06em] text-ivory uppercase transition-colors hover:bg-forest-soft"
          >
            <Icon name="plus" size={15} />
            New recipe
          </Link>
        }
      />

      <AdminBody size="wide" className="flex flex-col gap-5">
        <SearchFilter
          basePath="/admin/recipes"
          placeholder="Search recipes by title or slug"
          statuses={[
            { value: 'published', label: 'Published' },
            { value: 'draft', label: 'Draft' },
            { value: 'scheduled', label: 'Scheduled' },
          ]}
        />

        <AdminTable
          caption="All recipes"
          columns={columns}
          rows={result.rows}
          rowHref={(row) => `/admin/recipes/${row.id}`}
          empty={
            <EmptyState
              icon="flame"
              title={sp.q || sp.status ? 'No recipes match' : 'No recipes yet'}
              description={
                sp.q || sp.status
                  ? 'Try a different search, or clear the status filter.'
                  : 'Write your first recipe. It stays a draft until you choose to publish it.'
              }
              actionLabel={sp.q || sp.status ? 'Clear filters' : 'Create a recipe'}
              actionHref={sp.q || sp.status ? '/admin/recipes' : '/admin/recipes/new'}
            />
          }
        />

        <Pagination
          page={result.page}
          pageSize={result.pageSize}
          total={result.total}
          basePath="/admin/recipes"
          params={{ q: sp.q, status: sp.status }}
        />
      </AdminBody>
    </>
  )
}
