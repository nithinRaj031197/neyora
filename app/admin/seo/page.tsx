import Link from 'next/link'
import { AdminBody, AdminPageHeader, AdminPanel } from '@/components/admin/AdminShell'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { Alert } from '@/components/ui/Alert'
import { requireAdmin } from '@/lib/auth/session'
import { listAdminPages, listAdminRecipes, listAdminProducts } from '@/lib/content/admin'
import { getSiteSettings } from '@/lib/content/site'
import { createClient } from '@/lib/supabase/server'
import { absoluteUrl, publicEnv } from '@/lib/env'
import { truncate } from '@/lib/markdown/plain'

export const dynamic = 'force-dynamic'

/**
 * SEO overview.
 *
 * Not another settings form — the per-page SEO fields live with the content
 * they describe, which is where an editor is already looking. This screen
 * exists to answer "what is missing?" and to show what is actually being
 * emitted, so problems are found here rather than in Search Console weeks
 * later.
 */
export default async function AdminSeoPage() {
  await requireAdmin('/admin/seo')

  const [settings, pages, recipes, products] = await Promise.all([
    getSiteSettings(),
    listAdminPages(),
    listAdminRecipes({ pageSize: 100 }),
    listAdminProducts({ pageSize: 100 }),
  ])

  const supabase = await createClient()
  const { data: recipeSeo } = await supabase
    .from('recipes')
    .select('id, slug, title, seo_title, seo_description, excerpt, noindex, status')
    .is('deleted_at', null)

  const { data: productSeo } = await supabase
    .from('products')
    .select('id, slug, name, seo_title, seo_description, short_description, status')
    .is('deleted_at', null)

  const issues: { severity: 'warning' | 'info'; title: string; detail: string; href?: string }[] = []

  if (!settings.default_seo_title) {
    issues.push({
      severity: 'warning',
      title: 'No default SEO title',
      detail: 'Pages without their own title will fall back to a generated one.',
      href: '/admin/settings',
    })
  }
  if (!settings.default_seo_description) {
    issues.push({
      severity: 'warning',
      title: 'No default SEO description',
      detail: 'Search results will show whatever Google picks from the page instead.',
      href: '/admin/settings',
    })
  }
  if (!settings.default_og_image_id) {
    issues.push({
      severity: 'warning',
      title: 'No default sharing image',
      detail: 'Links shared on WhatsApp and social will appear without a preview image.',
      href: '/admin/settings',
    })
  }

  const recipesMissingDescription = (recipeSeo ?? []).filter(
    (r) => r.status === 'published' && !r.seo_description && !r.excerpt,
  )
  if (recipesMissingDescription.length > 0) {
    issues.push({
      severity: 'info',
      title: `${recipesMissingDescription.length} published recipe${recipesMissingDescription.length === 1 ? '' : 's'} with no description`,
      detail:
        'Without an excerpt or SEO description, the meta description is generated from the recipe body — usually worse than writing one.',
      href: '/admin/recipes',
    })
  }

  const noindexed = (recipeSeo ?? []).filter((r) => r.noindex && r.status === 'published')

  const siteUrl = publicEnv().siteUrl
  const isLocalhost = /localhost|127\.0\.0\.1/.test(siteUrl)

  return (
    <>
      <AdminPageHeader
        title="SEO"
        description="Per-page titles and descriptions are edited alongside the content itself. This screen shows what is being emitted and what is missing."
        breadcrumbs={[{ label: 'SEO' }]}
      />

      <AdminBody size="wide" className="flex flex-col gap-6">
        {isLocalhost ? (
          <Alert tone="warning" title="NEXT_PUBLIC_SITE_URL still points at localhost">
            Canonical URLs, Open Graph images and sitemap.xml are all built from it. Set it to your
            real domain before launch, or search engines will be told your pages live on localhost.
          </Alert>
        ) : null}

        <AdminPanel title="What is generated automatically" description="No configuration needed.">
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              { label: 'sitemap.xml', href: '/sitemap.xml', note: 'Built from the database, hourly' },
              { label: 'robots.txt', href: '/robots.txt', note: 'Blocks /admin, /api and /go' },
              { label: 'Organization schema', note: 'On every page, from Site settings' },
              { label: 'WebSite schema', note: 'On every page' },
              { label: 'Recipe schema', note: 'From structured ingredients and steps' },
              { label: 'Product schema', note: 'Including price and availability' },
              { label: 'FAQPage schema', note: 'From published FAQs' },
              { label: 'Breadcrumb schema', note: 'On every content page' },
              { label: 'Open Graph + X cards', note: 'Per page, with image fallbacks' },
              { label: 'Canonical URLs', note: 'Per page, overridable' },
            ].map((item) => (
              <li
                key={item.label}
                className="flex items-start gap-3 rounded-xs border border-beige bg-ivory px-3.5 py-3"
              >
                <Icon name="check" size={15} className="mt-0.5 text-success" />
                <div className="min-w-0">
                  <p className="text-[0.875rem] font-medium text-earth">
                    {item.href ? (
                      <Link
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline decoration-earth-muted/40 underline-offset-2 hover:decoration-earth"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      item.label
                    )}
                  </p>
                  <p className="mt-0.5 text-[0.75rem] text-earth-muted">{item.note}</p>
                </div>
              </li>
            ))}
          </ul>
        </AdminPanel>

        {issues.length > 0 ? (
          <AdminPanel title={`Worth fixing (${issues.length})`}>
            <ul className="flex flex-col gap-3">
              {issues.map((issue) => (
                <li
                  key={issue.title}
                  className="flex items-start justify-between gap-4 rounded-xs border border-beige bg-ivory px-4 py-3"
                >
                  <div className="flex items-start gap-3">
                    <Icon
                      name="alert"
                      size={16}
                      className={issue.severity === 'warning' ? 'mt-0.5 text-warning' : 'mt-0.5 text-earth-muted'}
                    />
                    <div>
                      <p className="text-[0.875rem] font-medium text-earth">{issue.title}</p>
                      <p className="mt-0.5 max-w-[70ch] text-[0.8125rem] leading-relaxed text-earth-muted">
                        {issue.detail}
                      </p>
                    </div>
                  </div>
                  {issue.href ? (
                    <Link
                      href={issue.href}
                      className="inline-flex h-9 shrink-0 items-center rounded-xs border border-beige px-3 text-[0.75rem] font-medium tracking-[0.04em] text-earth-soft uppercase transition-colors hover:border-forest/50 hover:text-forest"
                    >
                      Fix
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          </AdminPanel>
        ) : (
          <Alert tone="success" title="No SEO gaps found">
            Defaults are set and every published item has a description.
          </Alert>
        )}

        <AdminPanel
          title="Search result previews"
          description="Roughly how each published recipe will appear in Google. Titles over about 60 characters and descriptions over about 155 get truncated."
        >
          <ul className="flex flex-col gap-6">
            {(recipeSeo ?? [])
              .filter((r) => r.status === 'published')
              .slice(0, 12)
              .map((recipe) => {
                const title = recipe.seo_title || `${recipe.title} — ${settings.brand_name}`
                const description =
                  recipe.seo_description || recipe.excerpt || '(generated from the recipe body)'
                return (
                  <li key={recipe.id} className="max-w-[40rem]">
                    <p className="truncate font-mono text-[0.75rem] text-success">
                      {absoluteUrl(`/recipes/${recipe.slug}`)}
                    </p>
                    <p className="mt-0.5 text-[1.0625rem] leading-snug text-botanical">
                      {truncate(title, 60)}
                    </p>
                    <p className="mt-1 text-[0.8125rem] leading-relaxed text-earth-soft">
                      {truncate(description, 155)}
                    </p>
                    <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[0.6875rem] text-earth-muted">
                      <span>Title {title.length} chars</span>
                      <span>·</span>
                      <span>Description {description.length} chars</span>
                      {title.length > 60 ? <Badge tone="warning">Title will truncate</Badge> : null}
                      {description.length > 160 ? (
                        <Badge tone="warning">Description will truncate</Badge>
                      ) : null}
                      <Link
                        href={`/admin/recipes/${recipe.id}`}
                        className="text-botanical underline decoration-botanical/40 underline-offset-2"
                      >
                        Edit
                      </Link>
                    </p>
                  </li>
                )
              })}
          </ul>
        </AdminPanel>

        <AdminPanel title="Coverage">
          <dl className="grid gap-5 sm:grid-cols-4">
            <div>
              <dt className="text-[0.6875rem] font-semibold tracking-[0.14em] text-earth-muted uppercase">
                Pages in sitemap
              </dt>
              <dd className="mt-1.5 font-display text-2xl text-forest tabular-nums">
                {pages.filter((p) => p.status === 'published' && !p.noindex).length +
                  recipes.rows.filter((r) => r.status === 'published').length +
                  products.rows.filter((p) => p.status === 'published').length +
                  3}
              </dd>
            </div>
            <div>
              <dt className="text-[0.6875rem] font-semibold tracking-[0.14em] text-earth-muted uppercase">
                Recipes
              </dt>
              <dd className="mt-1.5 font-display text-2xl text-forest tabular-nums">
                {recipes.rows.filter((r) => r.status === 'published').length}
              </dd>
            </div>
            <div>
              <dt className="text-[0.6875rem] font-semibold tracking-[0.14em] text-earth-muted uppercase">
                Products
              </dt>
              <dd className="mt-1.5 font-display text-2xl text-forest tabular-nums">
                {(productSeo ?? []).filter((p) => p.status === 'published').length}
              </dd>
            </div>
            <div>
              <dt className="text-[0.6875rem] font-semibold tracking-[0.14em] text-earth-muted uppercase">
                Hidden from search
              </dt>
              <dd className="mt-1.5 font-display text-2xl text-forest tabular-nums">
                {noindexed.length + pages.filter((p) => p.noindex).length}
              </dd>
            </div>
          </dl>
        </AdminPanel>
      </AdminBody>
    </>
  )
}
