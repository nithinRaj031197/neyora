'use client'

import { useActionState, useState } from 'react'
import { saveProduct } from '@/lib/actions/products'
import { IDLE } from '@/lib/actions/state'
import { Alert } from '@/components/ui/Alert'
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/Form'
import { AdminPanel } from './AdminShell'
import { RichMarkdownEditor } from './RichMarkdownEditor'
import { NutritionEditor } from './NutritionEditor'
import { StringListEditor } from './StringListEditor'
import { GalleryField } from './GalleryField'
import { ImageField } from './ImageField'
import { SlugField } from './SlugField'
import { PublishBar } from './PublishBar'
import { useActionToast } from './Toast'
import type { AdminProduct } from '@/lib/content/admin'
import type { CategoryRow, ContentStatus, MediaRow, Nutrition } from '@/types/database'

/**
 * Product editor.
 *
 * Nothing here is mushroom-specific: category, variety, weight and highlights
 * are generic produce fields, so the first non-mushroom product needs no code
 * change — only a new category row.
 */
export function ProductForm({
  product,
  categories,
}: {
  product: AdminProduct | null
  categories: CategoryRow[]
}) {
  const [state, formAction] = useActionState(saveProduct, IDLE)
  useActionToast(state)

  const [name, setName] = useState(product?.name ?? '')
  const [status, setStatus] = useState<ContentStatus>(product?.status ?? 'draft')
  const [scheduledAt, setScheduledAt] = useState(product?.scheduled_at ?? null)
  const [nutrition, setNutrition] = useState<Nutrition>(
    product?.nutrition ?? { basis: '', per: [], note: '' },
  )
  const [highlights, setHighlights] = useState<string[]>(product?.highlights ?? [])
  const [images, setImages] = useState<MediaRow[]>(product?.images ?? [])

  const error = (field: string) => state.errors?.[field]

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      {product ? <input type="hidden" name="id" value={product.id} /> : null}

      {state.status === 'error' && state.message ? (
        <Alert tone="danger" title="Not saved">
          {state.message}
        </Alert>
      ) : null}

      <AdminPanel title="The basics">
        <div className="flex flex-col gap-5">
          <Field label="Product name" htmlFor="name" required error={error('name')}>
            <Input
              id="name"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              autoFocus={!product}
              invalid={Boolean(error('name'))}
              placeholder="Fresh Oyster Mushrooms"
            />
          </Field>

          <SlugField
            title={name}
            defaultValue={product?.slug ?? ''}
            error={error('slug')}
            prefix="/products/"
            locked={Boolean(product)}
          />

          <Field
            label="Short description"
            htmlFor="short_description"
            hint="One sentence, shown on product cards and used as the meta description."
            error={error('short_description')}
          >
            <Textarea
              id="short_description"
              name="short_description"
              rows={2}
              maxLength={320}
              defaultValue={product?.short_description ?? ''}
              invalid={Boolean(error('short_description'))}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Category" htmlFor="category_id">
              <Select id="category_id" name="category_id" defaultValue={product?.category_id ?? ''}>
                <option value="">No category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                    {category.status !== 'published' ? ' (unpublished)' : ''}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Availability" htmlFor="availability">
              <Select
                id="availability"
                name="availability"
                defaultValue={product?.availability ?? 'in_stock'}
              >
                <option value="in_stock">In season</option>
                <option value="low_stock">Limited availability</option>
                <option value="out_of_stock">Currently unavailable</option>
                <option value="seasonal">Seasonal</option>
                <option value="coming_soon">Coming soon</option>
              </Select>
            </Field>

            <Field label="Variety" htmlFor="variety" hint="e.g. Pleurotus ostreatus (Grey Oyster)">
              <Input id="variety" name="variety" defaultValue={product?.variety ?? ''} />
            </Field>

            <Field label="Grown at" htmlFor="origin">
              <Input id="origin" name="origin" defaultValue={product?.origin ?? ''} />
            </Field>
          </div>
        </div>
      </AdminPanel>

      <AdminPanel
        title="Pack and price"
        description="Leave the price blank if you would rather not publish one — the product page simply omits it."
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Weight (grams)" htmlFor="weight_grams" error={error('weight_grams')}>
            <Input
              id="weight_grams"
              name="weight_grams"
              type="number"
              min="1"
              defaultValue={product?.weight_grams ?? ''}
              invalid={Boolean(error('weight_grams'))}
            />
          </Field>
          <Field label="Weight label" htmlFor="weight_label" hint="Shown to customers, e.g. “200 g”">
            <Input id="weight_label" name="weight_label" defaultValue={product?.weight_label ?? ''} />
          </Field>
          <Field label="Selling price" htmlFor="price" error={error('price')}>
            <Input
              id="price"
              name="price"
              type="number"
              step="0.01"
              min="0"
              defaultValue={product?.price ?? ''}
              invalid={Boolean(error('price'))}
            />
          </Field>
          <Field label="MRP" htmlFor="mrp" hint="Shown struck through when higher than the price." error={error('mrp')}>
            <Input
              id="mrp"
              name="mrp"
              type="number"
              step="0.01"
              min="0"
              defaultValue={product?.mrp ?? ''}
              invalid={Boolean(error('mrp'))}
            />
          </Field>
          <Field label="Currency" htmlFor="currency" hint="Three-letter code">
            <Input
              id="currency"
              name="currency"
              maxLength={3}
              defaultValue={product?.currency ?? 'INR'}
              className="uppercase"
            />
          </Field>
          <Field label="Unit label" htmlFor="unit_label" hint="“per pack”, “per punnet”">
            <Input id="unit_label" name="unit_label" defaultValue={product?.unit_label ?? 'pack'} />
          </Field>
          <Field label="Shelf life" htmlFor="shelf_life">
            <Input
              id="shelf_life"
              name="shelf_life"
              defaultValue={product?.shelf_life ?? ''}
              placeholder="3–5 days refrigerated"
            />
          </Field>
        </div>
      </AdminPanel>

      <AdminPanel
        title="Photography"
        description="The first image is the primary one — it is used on cards and in social previews."
      >
        <GalleryField name="image_ids" value={images} onChange={setImages} folder="products" />
      </AdminPanel>

      <AdminPanel title="Description" description="The main product copy, written in Markdown.">
        <RichMarkdownEditor
          name="description"
          label="Full description"
          defaultValue={product?.description ?? ''}
          rows={18}
        />
      </AdminPanel>

      <AdminPanel title="Details">
        <div className="flex flex-col gap-6">
          <StringListEditor
            name="highlights"
            value={highlights}
            onChange={setHighlights}
            label="Highlights"
            hint="Short factual claims shown as a checklist. Keep them to things you can actually stand behind."
            placeholder="Harvested the morning of dispatch"
            addLabel="Add highlight"
            max={20}
          />

          <RichMarkdownEditor
            name="storage_notes"
            label="Storage notes"
            hint="Shown in the sidebar of the product page, alongside a link to the full storage guide."
            defaultValue={product?.storage_notes ?? ''}
            rows={8}
          />
        </div>
      </AdminPanel>

      <AdminPanel title="Nutrition" description="Optional. Appears as a table and in structured data.">
        <NutritionEditor name="nutrition" value={nutrition} onChange={setNutrition} />
      </AdminPanel>

      <AdminPanel title="Search and social">
        <div className="flex flex-col gap-5">
          <Field label="SEO title" htmlFor="seo_title" error={error('seo_title')}>
            <Input id="seo_title" name="seo_title" defaultValue={product?.seo_title ?? ''} maxLength={120} />
          </Field>
          <Field label="SEO description" htmlFor="seo_description" error={error('seo_description')}>
            <Textarea
              id="seo_description"
              name="seo_description"
              rows={2}
              maxLength={320}
              defaultValue={product?.seo_description ?? ''}
            />
          </Field>
          <Field
            label="Canonical URL"
            htmlFor="canonical_url"
            hint="Only if this product is listed elsewhere as the primary version."
            error={error('canonical_url')}
          >
            <Input
              id="canonical_url"
              name="canonical_url"
              type="url"
              defaultValue={product?.canonical_url ?? ''}
            />
          </Field>
          <ImageField
            name="og_image_id"
            label="Social sharing image"
            hint="Falls back to the first product photograph if left empty."
            defaultMedia={null}
            folder="social"
            aspect="1200 / 630"
          />
          <Checkbox
            name="featured"
            label="Feature this product"
            hint="Featured products appear first, and on the homepage."
            defaultChecked={product?.featured ?? false}
          />
          <Field label="Sort order" htmlFor="sort_order">
            <Input
              id="sort_order"
              name="sort_order"
              type="number"
              defaultValue={product?.sort_order ?? 0}
              className="max-w-32"
            />
          </Field>
        </div>
      </AdminPanel>

      <PublishBar
        status={status}
        onStatusChange={setStatus}
        scheduledAt={scheduledAt}
        onScheduledAtChange={(value) => setScheduledAt(value || null)}
        scheduleError={error('scheduled_at')}
        publicHref={product && product.status === 'published' ? `/products/${product.slug}` : undefined}
      />
    </form>
  )
}
