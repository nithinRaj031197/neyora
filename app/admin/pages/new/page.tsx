import { AdminBody, AdminPageHeader } from '@/components/admin/AdminShell'
import { PageForm } from '@/components/admin/PageForm'
import { Alert } from '@/components/ui/Alert'
import { requireAdmin } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export default async function NewPagePage() {
  await requireAdmin('/admin/pages/new')

  return (
    <>
      <AdminPageHeader
        title="New page"
        description="A new editorial page, addressed by its slug."
        breadcrumbs={[{ label: 'Pages', href: '/admin/pages' }, { label: 'New' }]}
      />
      <AdminBody size="wide" className="flex flex-col gap-6">
        <Alert tone="info" title="A new page needs a route to be reachable">
          Pages seeded with the database already have routes (<code className="font-mono">/about</code>,{' '}
          <code className="font-mono">/farm</code> and so on). A brand-new slug will not resolve
          until a matching route file exists — see the “Adding a page” section of{' '}
          <code className="font-mono">ADMIN_GUIDE.md</code>. Editing an existing page needs nothing
          at all.
        </Alert>
        <PageForm page={null} hero={null} />
      </AdminBody>
    </>
  )
}
