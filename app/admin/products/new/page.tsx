import { AdminBody, AdminPageHeader } from '@/components/admin/AdminShell'
import { ProductForm } from '@/components/admin/ProductForm'
import { requireAdmin } from '@/lib/auth/session'
import { getAdminProductCategories } from '@/lib/content/admin'

export const dynamic = 'force-dynamic'

export default async function NewProductPage() {
  await requireAdmin('/admin/products/new')
  const categories = await getAdminProductCategories()

  return (
    <>
      <AdminPageHeader
        title="New product"
        description="Saved as a draft until you set the status to published."
        breadcrumbs={[{ label: 'Products', href: '/admin/products' }, { label: 'New' }]}
      />
      <AdminBody size="wide">
        <ProductForm product={null} categories={categories} />
      </AdminBody>
    </>
  )
}
