'use client'

import { SimpleForm } from './SimpleForm'
import { saveSiteSettings } from '@/lib/actions/site'
import { AdminPanel } from './AdminShell'
import { ImageField } from './ImageField'
import { Checkbox, Field, Input, Textarea } from '@/components/ui/Form'
import type { MediaRow, SiteSettingsRow } from '@/types/database'

export function SiteSettingsForm({
  settings,
  ogImage,
}: {
  settings: SiteSettingsRow
  ogImage: MediaRow | null
}) {
  return (
    <SimpleForm action={saveSiteSettings} submitLabel="Save settings">
      {(state) => (
        <div className="flex flex-col gap-6">
          <AdminPanel title="Brand">
            <div className="flex flex-col gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Brand name" htmlFor="brand_name" required error={state.errors?.brand_name}>
                  <Input
                    id="brand_name"
                    name="brand_name"
                    required
                    defaultValue={settings.brand_name}
                    invalid={Boolean(state.errors?.brand_name)}
                  />
                </Field>
                <Field label="Tagline" htmlFor="tagline">
                  <Input id="tagline" name="tagline" defaultValue={settings.tagline} />
                </Field>
              </div>
              <Field
                label="Brand description"
                htmlFor="brand_description"
                hint="One or two sentences. Used in structured data and as an SEO fallback."
              >
                <Textarea
                  id="brand_description"
                  name="brand_description"
                  rows={2}
                  defaultValue={settings.brand_description ?? ''}
                />
              </Field>
              <Field
                label="Legal entity name"
                htmlFor="organization_legal_name"
                hint="The registered business name, if it differs from the brand."
              >
                <Input
                  id="organization_legal_name"
                  name="organization_legal_name"
                  defaultValue={settings.organization_legal_name ?? ''}
                />
              </Field>
            </div>
          </AdminPanel>

          <AdminPanel
            title="Contact"
            description="Every channel here is optional. Leaving one blank removes it from the site rather than showing a dead link."
          >
            <div className="flex flex-col gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Email" htmlFor="contact_email" error={state.errors?.contact_email}>
                  <Input
                    id="contact_email"
                    name="contact_email"
                    type="email"
                    defaultValue={settings.contact_email ?? ''}
                  />
                </Field>
                <Field label="Phone" htmlFor="contact_phone">
                  <Input id="contact_phone" name="contact_phone" type="tel" defaultValue={settings.contact_phone ?? ''} />
                </Field>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="WhatsApp number"
                  htmlFor="whatsapp_number"
                  required={false}
                  hint="Digits only, including the country code — e.g. 919876543210. No plus sign, spaces or dashes: wa.me rejects them."
                  error={state.errors?.whatsapp_number}
                >
                  <Input
                    id="whatsapp_number"
                    name="whatsapp_number"
                    defaultValue={settings.whatsapp_number ?? ''}
                    invalid={Boolean(state.errors?.whatsapp_number)}
                    className="font-mono"
                    placeholder="919876543210"
                  />
                </Field>
                <Field
                  label="Default WhatsApp message"
                  htmlFor="whatsapp_message"
                  hint="Pre-filled when someone taps a WhatsApp button."
                >
                  <Input
                    id="whatsapp_message"
                    name="whatsapp_message"
                    defaultValue={settings.whatsapp_message ?? ''}
                  />
                </Field>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Address line 1" htmlFor="address_line1">
                  <Input id="address_line1" name="address_line1" defaultValue={settings.address_line1 ?? ''} />
                </Field>
                <Field label="Address line 2" htmlFor="address_line2">
                  <Input id="address_line2" name="address_line2" defaultValue={settings.address_line2 ?? ''} />
                </Field>
                <Field label="City" htmlFor="city">
                  <Input id="city" name="city" defaultValue={settings.city ?? ''} />
                </Field>
                <Field label="State" htmlFor="state">
                  <Input id="state" name="state" defaultValue={settings.state ?? ''} />
                </Field>
                <Field label="Postal code" htmlFor="postal_code">
                  <Input id="postal_code" name="postal_code" defaultValue={settings.postal_code ?? ''} />
                </Field>
                <Field label="Country" htmlFor="country">
                  <Input id="country" name="country" defaultValue={settings.country ?? ''} />
                </Field>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Google Maps link"
                  htmlFor="google_maps_url"
                  error={state.errors?.google_maps_url}
                >
                  <Input
                    id="google_maps_url"
                    name="google_maps_url"
                    type="url"
                    defaultValue={settings.google_maps_url ?? ''}
                  />
                </Field>
                <Field label="Business hours" htmlFor="business_hours">
                  <Input
                    id="business_hours"
                    name="business_hours"
                    defaultValue={settings.business_hours ?? ''}
                    placeholder="Monday to Saturday, 8am – 6pm IST"
                  />
                </Field>
              </div>
            </div>
          </AdminPanel>

          <AdminPanel title="Footer">
            <div className="flex flex-col gap-5">
              <Field label="Footer tagline" htmlFor="footer_tagline" hint="The larger line in the footer.">
                <Input id="footer_tagline" name="footer_tagline" defaultValue={settings.footer_tagline ?? ''} />
              </Field>
              <Field label="Footer note" htmlFor="footer_note" hint="A sentence under the tagline.">
                <Textarea id="footer_note" name="footer_note" rows={2} defaultValue={settings.footer_note ?? ''} />
              </Field>
              <Field label="Copyright holder" htmlFor="copyright_holder">
                <Input
                  id="copyright_holder"
                  name="copyright_holder"
                  defaultValue={settings.copyright_holder ?? ''}
                />
              </Field>
            </div>
          </AdminPanel>

          <AdminPanel
            title="Announcement bar"
            description="A single line above the header. Good for a seasonal note or a delivery pause. Turn it off when it stops being true."
          >
            <div className="flex flex-col gap-5">
              <Checkbox
                name="announcement_enabled"
                label="Show the announcement bar"
                defaultChecked={settings.announcement_enabled}
              />
              <Field label="Message" htmlFor="announcement_text">
                <Input
                  id="announcement_text"
                  name="announcement_text"
                  defaultValue={settings.announcement_text ?? ''}
                  maxLength={200}
                />
              </Field>
              <Field
                label="Link"
                htmlFor="announcement_href"
                hint="Optional. A path like /products, or a full https:// URL."
                error={state.errors?.announcement_href}
              >
                <Input
                  id="announcement_href"
                  name="announcement_href"
                  defaultValue={settings.announcement_href ?? ''}
                  className="font-mono"
                />
              </Field>
            </div>
          </AdminPanel>

          <AdminPanel
            title="Default SEO"
            description="Used wherever a page has not set its own title, description or sharing image."
          >
            <div className="flex flex-col gap-5">
              <Field label="Default title" htmlFor="default_seo_title" error={state.errors?.default_seo_title}>
                <Input
                  id="default_seo_title"
                  name="default_seo_title"
                  defaultValue={settings.default_seo_title ?? ''}
                  maxLength={120}
                />
              </Field>
              <Field
                label="Default description"
                htmlFor="default_seo_description"
                error={state.errors?.default_seo_description}
              >
                <Textarea
                  id="default_seo_description"
                  name="default_seo_description"
                  rows={2}
                  defaultValue={settings.default_seo_description ?? ''}
                  maxLength={320}
                />
              </Field>
              <ImageField
                name="default_og_image_id"
                label="Default sharing image"
                hint="Shown when a page with no image of its own is shared. 1200 × 630 is ideal."
                defaultMedia={ogImage}
                folder="social"
                aspect="1200 / 630"
              />
            </div>
          </AdminPanel>
        </div>
      )}
    </SimpleForm>
  )
}
