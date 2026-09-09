import { AdminBody, AdminPageHeader, AdminPanel } from '@/components/admin/AdminShell'
import { SiteSettingsForm } from '@/components/admin/SiteSettingsForm'
import { PurgeDemoButton } from '@/components/admin/PurgeDemoButton'
import { requireRole } from '@/lib/auth/session'
import { getSiteSettings, getMediaByIds } from '@/lib/content/site'

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  // Contact details and default SEO are site-wide: editors can write content,
  // but only admins and owners change how the business is reachable.
  await requireRole('admin', '/admin/settings')

  const settings = await getSiteSettings()
  const media = await getMediaByIds([settings.default_og_image_id])

  return (
    <>
      <AdminPageHeader
        title="Site settings"
        description="Brand, contact details, WhatsApp, the announcement bar and default SEO. These appear on every page of the site."
        breadcrumbs={[{ label: 'Site settings' }]}
      />

      <AdminBody className="flex flex-col gap-6">
        <SiteSettingsForm
          settings={settings}
          ogImage={
            settings.default_og_image_id ? media.get(settings.default_og_image_id) ?? null : null
          }
        />

        <AdminPanel
          title="Demo content"
          description="The database ships with seeded recipes, a product, FAQs and testimonials so the site is never empty on a fresh install. Once your own content is in place, remove what is left."
        >
          <PurgeDemoButton />
        </AdminPanel>
      </AdminBody>
    </>
  )
}
