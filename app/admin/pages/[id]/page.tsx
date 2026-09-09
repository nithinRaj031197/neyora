import { notFound } from 'next/navigation'
import { AdminBody, AdminPageHeader, AdminPanel } from '@/components/admin/AdminShell'
import { PageForm } from '@/components/admin/PageForm'
import { ConfirmButton } from '@/components/admin/ConfirmButton'
import { Alert } from '@/components/ui/Alert'
import { Badge, StatusBadge, isPublicationLive } from '@/components/ui/Badge'
import { requireAdmin } from '@/lib/auth/session'
import { getAdminPage } from '@/lib/content/admin'
import { deletePage } from '@/lib/actions/pages'
import { formatDateTime } from '@/lib/utils/format'

export const dynamic = 'force-dynamic'

export default async function EditPagePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ created?: string }>
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams])
  await requireAdmin(`/admin/pages/${id}`)

  const page = await getAdminPage(id)
  if (!page) notFound()

  return (
    <>
      <AdminPageHeader
        title={page.title}
        description={`Last saved ${formatDateTime(page.updated_at)}`}
        breadcrumbs={[{ label: 'Pages', href: '/admin/pages' }, { label: page.title }]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge
              status={page.status}
              isLive={isPublicationLive(page.status, page.scheduled_at)}
            />
            {page.is_demo ? <Badge tone="golden">Demo copy</Badge> : null}
          </div>
        }
      />

      <AdminBody size="wide" className="flex flex-col gap-6">
        {sp.created ? <Alert tone="success">Page created.</Alert> : null}
        {page.is_demo ? (
          <Alert tone="warning" title="This page still has its seeded copy">
            The text is a starting point written to sound like NEYORA, not a statement of fact about
            your farm. Rewrite it before you launch — especially the legal pages, which are
            templates and not legal advice.
          </Alert>
        ) : null}

        <PageForm page={page} hero={page.hero} />

        {!page.is_system ? (
          <AdminPanel
            title="Delete this page"
            description="Soft delete — the record is retained in the database."
          >
            <ConfirmButton
              action={deletePage}
              hiddenFields={{ id: page.id }}
              triggerLabel="Delete page"
              title={`Delete “${page.title}”?`}
              description="The page will 404 for anyone who has the link. This is a soft delete — the content is retained and can be restored by an administrator."
              confirmLabel="Delete page"
            />
          </AdminPanel>
        ) : null}
      </AdminBody>
    </>
  )
}
