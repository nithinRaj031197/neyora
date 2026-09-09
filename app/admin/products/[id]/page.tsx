import { notFound } from 'next/navigation'
import { AdminBody, AdminPageHeader, AdminPanel } from '@/components/admin/AdminShell'
import { ProductForm } from '@/components/admin/ProductForm'
import { ConfirmButton } from '@/components/admin/ConfirmButton'
import { Alert } from '@/components/ui/Alert'
import { Badge, StatusBadge, isPublicationLive } from '@/components/ui/Badge'
import { requireAdmin } from '@/lib/auth/session'
import { getAdminProduct, getAdminProductCategories } from '@/lib/content/admin'
import { deleteProduct } from '@/lib/actions/products'
import { formatDateTime } from '@/lib/utils/format'

export const dynamic = 'force-dynamic'

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ created?: string }>
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams])
  await requireAdmin(`/admin/products/${id}`)

  const [product, categories] = await Promise.all([
    getAdminProduct(id),
    getAdminProductCategories(),
  ])
  if (!product) notFound()

  return (
    <>
      <AdminPageHeader
        title={product.name}
        description={`Last saved ${formatDateTime(product.updated_at)}`}
        breadcrumbs={[{ label: 'Products', href: '/admin/products' }, { label: product.name }]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge
              status={product.status}
              isLive={isPublicationLive(product.status, product.scheduled_at)}
            />
            {product.is_demo ? <Badge tone="golden">Demo content</Badge> : null}
          </div>
        }
      />

      <AdminBody size="wide" className="flex flex-col gap-6">
        {sp.created ? <Alert tone="success">Product created.</Alert> : null}
        {product.is_demo ? (
          <Alert tone="warning" title="This is seeded demo content">
            The copy, prices and nutrition figures are placeholders. Replace them with your own
            before publishing anything to customers.
          </Alert>
        ) : null}

        <ProductForm product={product} categories={categories} />

        <AdminPanel
          title="Delete this product"
          description="Removes it from the website immediately. Soft delete — the record stays in the database."
        >
          <ConfirmButton
            action={deleteProduct}
            hiddenFields={{ id: product.id }}
            triggerLabel="Delete product"
            title={`Delete “${product.name}”?`}
            description="It disappears from the website straight away. This is a soft delete — the data is retained and can be restored by an administrator."
            confirmLabel="Delete product"
          />
        </AdminPanel>
      </AdminBody>
    </>
  )
}
