import { AdminBody, AdminPageHeader } from '@/components/admin/AdminShell'
import { HomepageForm } from '@/components/admin/HomepageForm'
import { Alert } from '@/components/ui/Alert'
import { requireAdmin } from '@/lib/auth/session'
import { getAdminHomepage } from '@/lib/content/admin'
import { getMediaByIds } from '@/lib/content/site'

export const dynamic = 'force-dynamic'

export default async function AdminHomepagePage() {
  await requireAdmin('/admin/homepage')
  const homepage = await getAdminHomepage()

  if (!homepage) {
    return (
      <>
        <AdminPageHeader title="Homepage" breadcrumbs={[{ label: 'Homepage' }]} />
        <AdminBody>
          <Alert tone="danger" title="No homepage row found">
            The <code className="font-mono">homepage</code> table should contain exactly one row
            (id = 1), created by the seed migration. Run{' '}
            <code className="font-mono">supabase db push</code> and reload.
          </Alert>
        </AdminBody>
      </>
    )
  }

  const media = await getMediaByIds([
    homepage.hero_image_id,
    homepage.farm_image_id,
    homepage.final_cta_image_id,
    homepage.og_image_id,
  ])

  return (
    <>
      <AdminPageHeader
        title="Homepage"
        description="Every headline, paragraph, button and image on the homepage. Changes are live as soon as you save."
        breadcrumbs={[{ label: 'Homepage' }]}
      />
      <AdminBody size="wide">
        <HomepageForm
          homepage={homepage}
          media={{
            hero: homepage.hero_image_id ? media.get(homepage.hero_image_id) ?? null : null,
            farm: homepage.farm_image_id ? media.get(homepage.farm_image_id) ?? null : null,
            cta: homepage.final_cta_image_id
              ? media.get(homepage.final_cta_image_id) ?? null
              : null,
            og: homepage.og_image_id ? media.get(homepage.og_image_id) ?? null : null,
          }}
        />
      </AdminBody>
    </>
  )
}
