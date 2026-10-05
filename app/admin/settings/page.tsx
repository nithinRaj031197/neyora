import { redirect } from 'next/navigation'
import { getCurrentAdmin } from '@/lib/auth/session'
import { getSiteSettingsFromFile } from '@/lib/content'
import { readSettingsOverride, settingsLastUpdated } from '@/lib/settings/repository'
import { getHomepageVisibility } from '@/lib/content'
import { SettingsForm } from '@/components/admin/SettingsForm'
import { HomepageSectionsForm } from '@/components/admin/HomepageSectionsForm'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  // The real check. The layout's is for chrome only.
  if (!(await getCurrentAdmin())) redirect('/admin/login')

  const [override, file, updated, sections] = await Promise.all([
    readSettingsOverride(),
    Promise.resolve(getSiteSettingsFromFile()),
    settingsLastUpdated(),
    getHomepageVisibility(),
  ])

  // Flattened so the form can show the file value as each field's placeholder —
  // which is what you get back if you clear the field.
  const fileDefaults = {
    contactEmail: file.contactEmail,
    contactPhone: file.contactPhone,
    whatsappNumber: file.whatsappNumber,
    whatsappMessage: file.whatsappMessage,
    businessHours: file.businessHours,
    addressLine1: file.address.line1,
    addressLine2: file.address.line2,
    addressCity: file.address.city,
    addressState: file.address.state,
    addressPostalCode: file.address.postalCode,
    addressCountry: file.address.country,
  }

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="font-display text-[1.75rem] text-forest">Contact details</h1>
        {updated ? (
          <p className="text-[0.8125rem] text-earth-muted">
            Last changed{' '}
            {new Date(updated.at).toLocaleString('en-IN', {
              dateStyle: 'medium',
              timeStyle: 'short',
              timeZone: 'Asia/Kolkata',
            })}{' '}
            by {updated.by}
          </p>
        ) : null}
      </div>

      <p className="mt-3 max-w-[60ch] text-[0.9375rem] leading-relaxed text-earth-soft">
        Changes go live the moment you save — there is no deploy to wait for.
      </p>

      <SettingsForm values={override} fileDefaults={fileDefaults} />

      <section className="mt-14 rounded-sm border border-beige bg-ivory p-6 sm:p-8">
        <h2 className="font-display text-[1.125rem] text-forest">Homepage chapters</h2>
        <p className="mt-1.5 max-w-[62ch] text-[0.875rem] leading-relaxed text-earth-muted">
          Switch a chapter off to take it off the public homepage. Everything
          above it and below it closes up — there is no gap left behind.
        </p>

        <div className="mt-6">
          <HomepageSectionsForm values={sections} />
        </div>
      </section>
    </>
  )
}
