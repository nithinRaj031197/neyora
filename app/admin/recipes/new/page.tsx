import { AdminBody, AdminPageHeader } from '@/components/admin/AdminShell'
import { RecipeForm } from '@/components/admin/RecipeForm'
import { requireAdmin } from '@/lib/auth/session'
import { getAdminRecipeCategories, getAdminRecipeTags } from '@/lib/content/admin'

export const dynamic = 'force-dynamic'

export default async function NewRecipePage() {
  await requireAdmin('/admin/recipes/new')
  const [categories, tags] = await Promise.all([
    getAdminRecipeCategories(),
    getAdminRecipeTags(),
  ])

  return (
    <>
      <AdminPageHeader
        title="New recipe"
        description="It stays a draft until you set the status to published, so save early and often."
        breadcrumbs={[{ label: 'Recipes', href: '/admin/recipes' }, { label: 'New' }]}
      />
      <AdminBody size="wide">
        <RecipeForm recipe={null} categories={categories} tags={tags} cover={null} />
      </AdminBody>
    </>
  )
}
