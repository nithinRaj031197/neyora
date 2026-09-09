import Link from 'next/link'
import { AdminBody, AdminPageHeader, AdminPanel } from '@/components/admin/AdminShell'
import { SimpleForm } from '@/components/admin/SimpleForm'
import { PublicationFields } from '@/components/admin/PublicationFields'
import { ConfirmButton } from '@/components/admin/ConfirmButton'
import { ImageField } from '@/components/admin/ImageField'
import { Field, Input, Textarea } from '@/components/ui/Form'
import { Badge, StatusBadge, isPublicationLive } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Icon } from '@/components/ui/Icon'
import { requireAdmin } from '@/lib/auth/session'
import {
  getAdminProductCategories,
  getAdminRecipeCategories,
  getAdminRecipeTags,
} from '@/lib/content/admin'
import { deleteCategory, deleteTag, saveCategory, saveTag } from '@/lib/actions/taxonomy'
import { getMediaByIds } from '@/lib/content/site'

export const dynamic = 'force-dynamic'

/**
 * Categories and tags.
 *
 * Recipe categories, product categories and recipe tags on one screen,
 * because they are the same conceptual job and splitting them across three
 * routes would only add navigation.
 */
export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; edit?: string; new?: string; tag?: string; newTag?: string }>
}) {
  await requireAdmin('/admin/categories')
  const sp = await searchParams

  const [recipeCategories, productCategories, tags] = await Promise.all([
    getAdminRecipeCategories(),
    getAdminProductCategories(),
    getAdminRecipeTags(),
  ])

  const kind = sp.kind === 'product' ? 'product' : 'recipe'
  const pool = kind === 'product' ? productCategories : recipeCategories
  const editing = sp.edit ? pool.find((c) => c.id === sp.edit) ?? null : null
  const showCategoryForm = Boolean(editing || sp.new)

  // Kept as its own typed lookup: only recipe categories carry SEO columns,
  // and narrowing a union of the two row shapes inline is not worth it.
  const editingRecipeCategory =
    kind === 'recipe' && sp.edit ? (recipeCategories.find((c) => c.id === sp.edit) ?? null) : null

  const editingTag = sp.tag ? tags.find((t) => t.id === sp.tag) ?? null : null
  const showTagForm = Boolean(editingTag || sp.newTag)

  const media = await getMediaByIds([editing?.image_id])
  const editingImage = editing?.image_id ? media.get(editing.image_id) ?? null : null

  return (
    <>
      <AdminPageHeader
        title="Categories & tags"
        description="Categories give recipes and products their own landing pages. Tags are lighter — they only drive filtering."
        breadcrumbs={[{ label: 'Categories' }]}
      />

      <AdminBody className="flex flex-col gap-6">
        {showCategoryForm ? (
          <AdminPanel
            title={
              editing
                ? `Edit ${kind} category`
                : `New ${kind} category`
            }
          >
            <SimpleForm
              action={saveCategory}
              cancelHref="/admin/categories"
              submitLabel={editing ? 'Save category' : 'Create category'}
            >
              {(state) => (
                <>
                  <input type="hidden" name="kind" value={kind} />
                  {editing ? <input type="hidden" name="id" value={editing.id} /> : null}

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Name" htmlFor="name" required error={state.errors?.name}>
                      <Input
                        id="name"
                        name="name"
                        required
                        defaultValue={editing?.name ?? ''}
                        invalid={Boolean(state.errors?.name)}
                      />
                    </Field>
                    <Field
                      label="URL slug"
                      htmlFor="slug"
                      required
                      error={state.errors?.slug}
                      hint={
                        kind === 'recipe'
                          ? 'Becomes /recipes/category/<slug>'
                          : 'Used to filter /products'
                      }
                    >
                      <Input
                        id="slug"
                        name="slug"
                        required
                        spellCheck={false}
                        defaultValue={editing?.slug ?? ''}
                        invalid={Boolean(state.errors?.slug)}
                        className="font-mono"
                      />
                    </Field>
                  </div>

                  <Field label="Description" htmlFor="description" error={state.errors?.description}>
                    <Textarea
                      id="description"
                      name="description"
                      rows={3}
                      defaultValue={editing?.description ?? ''}
                    />
                  </Field>

                  <ImageField
                    name="image_id"
                    label="Category image"
                    hint="Shown at the top of the category page."
                    defaultMedia={editingImage}
                    folder="categories"
                  />

                  {kind === 'recipe' ? (
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field label="SEO title" htmlFor="seo_title">
                        <Input
                          id="seo_title"
                          name="seo_title"
                          defaultValue={editingRecipeCategory?.seo_title ?? ''}
                        />
                      </Field>
                      <Field label="SEO description" htmlFor="seo_description">
                        <Input
                          id="seo_description"
                          name="seo_description"
                          defaultValue={editingRecipeCategory?.seo_description ?? ''}
                        />
                      </Field>
                    </div>
                  ) : null}

                  <Field label="Sort order" htmlFor="sort_order">
                    <Input
                      id="sort_order"
                      name="sort_order"
                      type="number"
                      defaultValue={editing?.sort_order ?? 0}
                      className="max-w-32"
                    />
                  </Field>

                  <PublicationFields
                    defaultStatus={editing?.status ?? 'published'}
                    defaultScheduledAt={editing?.scheduled_at ?? null}
                    scheduleError={state.errors?.scheduled_at}
                  />
                </>
              )}
            </SimpleForm>
          </AdminPanel>
        ) : null}

        {(
          [
            { key: 'recipe' as const, label: 'Recipe categories', rows: recipeCategories },
            { key: 'product' as const, label: 'Product categories', rows: productCategories },
          ]
        ).map((group) => (
          <AdminPanel
            key={group.key}
            title={`${group.label} (${group.rows.length})`}
            actions={
              <Link
                href={`/admin/categories?kind=${group.key}&new=1`}
                className="inline-flex h-9 items-center gap-1.5 rounded-xs border border-beige px-3 text-[0.75rem] font-medium text-earth-soft transition-colors hover:border-forest/50 hover:text-forest"
              >
                <Icon name="plus" size={13} />
                Add
              </Link>
            }
          >
            {group.rows.length === 0 ? (
              <EmptyState
                compact
                icon="chevron-right"
                title={`No ${group.label.toLowerCase()} yet`}
                description="Categories are optional, but they give content its own landing page."
              />
            ) : (
              <ul className="flex flex-col">
                {group.rows.map((category) => (
                  <li
                    key={category.id}
                    className="flex flex-wrap items-center justify-between gap-4 border-b border-beige/70 py-3 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p className="text-[0.9375rem] font-medium text-earth">{category.name}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-2 font-mono text-[0.6875rem] text-earth-muted">
                        /{category.slug}
                        <StatusBadge
            status={category.status}
            isLive={isPublicationLive(category.status, category.scheduled_at)}
          />
                        {category.is_demo ? <Badge tone="golden">Demo</Badge> : null}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Link
                        href={`/admin/categories?kind=${group.key}&edit=${category.id}`}
                        className="inline-flex h-9 items-center rounded-xs border border-beige px-3 text-[0.75rem] font-medium tracking-[0.04em] text-earth-soft uppercase transition-colors hover:border-forest/50 hover:text-forest"
                      >
                        Edit
                      </Link>
                      <ConfirmButton
                        action={deleteCategory}
                        hiddenFields={{ id: category.id, kind: group.key }}
                        triggerLabel="Delete"
                        title={`Delete “${category.name}”?`}
                        description="Content in this category is not deleted — it simply loses its category. This is a soft delete."
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </AdminPanel>
        ))}

        <AdminPanel
          title={`Recipe tags (${tags.length})`}
          description="Used for filtering on the recipes page and included in each recipe's structured data."
          actions={
            <Link
              href="/admin/categories?newTag=1"
              className="inline-flex h-9 items-center gap-1.5 rounded-xs border border-beige px-3 text-[0.75rem] font-medium text-earth-soft transition-colors hover:border-forest/50 hover:text-forest"
            >
              <Icon name="plus" size={13} />
              Add tag
            </Link>
          }
        >
          <div className="flex flex-col gap-5">
            {showTagForm ? (
              <div className="rounded-sm border border-beige bg-ivory-soft p-4">
                <SimpleForm
                  action={saveTag}
                  cancelHref="/admin/categories"
                  submitLabel={editingTag ? 'Save tag' : 'Create tag'}
                >
                  {(state) => (
                    <>
                      {editingTag ? <input type="hidden" name="id" value={editingTag.id} /> : null}
                      <div className="grid gap-5 sm:grid-cols-2">
                        <Field label="Name" htmlFor="tag-name" required error={state.errors?.name}>
                          <Input
                            id="tag-name"
                            name="name"
                            required
                            defaultValue={editingTag?.name ?? ''}
                            invalid={Boolean(state.errors?.name)}
                          />
                        </Field>
                        <Field label="Slug" htmlFor="tag-slug" required error={state.errors?.slug}>
                          <Input
                            id="tag-slug"
                            name="slug"
                            required
                            spellCheck={false}
                            defaultValue={editingTag?.slug ?? ''}
                            invalid={Boolean(state.errors?.slug)}
                            className="font-mono"
                          />
                        </Field>
                      </div>
                    </>
                  )}
                </SimpleForm>
              </div>
            ) : null}

            {tags.length === 0 ? (
              <p className="text-[0.875rem] text-earth-muted">No tags yet.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <li
                    key={tag.id}
                    className="inline-flex items-center gap-2 rounded-xs border border-beige bg-ivory px-3 py-1.5"
                  >
                    <span className="text-[0.8125rem] text-earth">{tag.name}</span>
                    <Link
                      href={`/admin/categories?tag=${tag.id}`}
                      aria-label={`Edit ${tag.name}`}
                      className="text-earth-muted transition-colors hover:text-forest"
                    >
                      <Icon name="chevron-right" size={13} />
                    </Link>
                    <ConfirmButton
                      action={deleteTag}
                      hiddenFields={{ id: tag.id }}
                      triggerLabel="×"
                      title={`Delete the “${tag.name}” tag?`}
                      description="It is removed from every recipe that uses it. The recipes themselves are unaffected."
                      triggerClassName="text-earth-muted transition-colors hover:text-danger"
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </AdminPanel>
      </AdminBody>
    </>
  )
}
