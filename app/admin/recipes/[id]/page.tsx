import { notFound } from 'next/navigation'
import { AdminBody, AdminPageHeader, AdminPanel } from '@/components/admin/AdminShell'
import { RecipeForm } from '@/components/admin/RecipeForm'
import { PackVariantsPanel } from '@/components/admin/PackVariantsPanel'
import { ConfirmButton } from '@/components/admin/ConfirmButton'
import { Alert } from '@/components/ui/Alert'
import { Badge, StatusBadge, isPublicationLive } from '@/components/ui/Badge'
import { requireAdmin } from '@/lib/auth/session'
import {
  getAdminRecipe,
  getAdminRecipeCategories,
  getAdminRecipeTags,
} from '@/lib/content/admin'
import { deleteRecipe } from '@/lib/actions/recipes'
import { formatDateTime } from '@/lib/utils/format'

export const dynamic = 'force-dynamic'

export default async function EditRecipePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ created?: string; duplicated?: string }>
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams])
  await requireAdmin(`/admin/recipes/${id}`)

  const [recipe, categories, tags] = await Promise.all([
    getAdminRecipe(id),
    getAdminRecipeCategories(),
    getAdminRecipeTags(),
  ])

  if (!recipe) notFound()

  return (
    <>
      <AdminPageHeader
        title={recipe.title}
        description={`Last saved ${formatDateTime(recipe.updated_at)} · ${recipe.view_count.toLocaleString('en-GB')} views`}
        breadcrumbs={[{ label: 'Recipes', href: '/admin/recipes' }, { label: recipe.title }]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge
            status={recipe.status}
            isLive={isPublicationLive(recipe.status, recipe.scheduled_at)}
          />
            {recipe.is_demo ? <Badge tone="golden">Demo content</Badge> : null}
          </div>
        }
      />

      <AdminBody size="wide" className="flex flex-col gap-6">
        {sp.created ? <Alert tone="success">Recipe created. It is a draft until you publish it.</Alert> : null}
        {sp.duplicated ? (
          <Alert tone="info" title="Duplicated">
            This is a copy, saved as a draft with a new slug. Edit it and publish when ready.
          </Alert>
        ) : null}
        {recipe.is_demo ? (
          <Alert tone="warning" title="This is seeded demo content">
            Rewrite it with your own recipe, or delete it. Once your real content is in place you can
            clear everything left over from Admin → Site settings.
          </Alert>
        ) : null}

        <RecipeForm
          recipe={recipe}
          categories={categories}
          tags={tags}
          cover={recipe.cover}
        />

        <PackVariantsPanel
          recipeId={recipe.id}
          basePackGrams={recipe.base_pack_grams}
          recommendedPack={recipe.recommended_pack_size}
          baseIngredients={recipe.ingredients}
          variants={recipe.pack_variants}
        />

        <AdminPanel
          title="Delete this recipe"
          description="Deleting removes it from the website immediately. The record is kept in the database (soft delete), so it can be restored with a SQL update if you change your mind."
        >
          <ConfirmButton
            action={deleteRecipe}
            hiddenFields={{ id: recipe.id }}
            triggerLabel="Delete recipe"
            title={`Delete “${recipe.title}”?`}
            description="It will disappear from the website straight away. This is a soft delete — the data is retained in the database and can be restored by an administrator."
            confirmLabel="Delete recipe"
          />
        </AdminPanel>
      </AdminBody>
    </>
  )
}
