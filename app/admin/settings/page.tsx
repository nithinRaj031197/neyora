import { redirect } from 'next/navigation'
import { getCurrentAdmin } from '@/lib/auth/session'
import { getSiteSettingsFromFile } from '@/lib/content'
import { readSettingsOverride, settingsLastUpdated } from '@/lib/settings/repository'
import { SettingsForm } from '@/components/admin/SettingsForm'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  // The real check. The layout's is for chrome only.
  if (!(await getCurrentAdmin())) redirect('/admin/login')

  const [override, file, updated] = await Promise.all([
    readSettingsOverride(),
    Promise.resolve(getSiteSettingsFromFile()),
    settingsLastUpdated(),
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
        These appear in the footer, on the contact page, and behind every WhatsApp
        button on the site. Changes are live as soon as you save — no deploy.
      </p>

      <SettingsForm values={override} fileDefaults={fileDefaults} />
    </>
  )
}
