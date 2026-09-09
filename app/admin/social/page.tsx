import { AdminBody, AdminPageHeader, AdminPanel } from '@/components/admin/AdminShell'
import { SimpleForm } from '@/components/admin/SimpleForm'
import { Field, Input } from '@/components/ui/Form'
import { Icon, socialIconName } from '@/components/ui/Icon'
import { Alert } from '@/components/ui/Alert'
import { requireAdmin } from '@/lib/auth/session'
import { listAdminSocialLinks } from '@/lib/content/admin'
import { saveSocialLinks } from '@/lib/actions/site'

export const dynamic = 'force-dynamic'

/**
 * Social links.
 *
 * One form, one save. The footer and contact page read these rows directly, so
 * a link only appears once it is both enabled and has a URL — an enabled-but-
 * empty row would render a link to nowhere, which RLS also filters out.
 */
export default async function AdminSocialPage() {
  await requireAdmin('/admin/social')
  const links = await listAdminSocialLinks()

  return (
    <>
      <AdminPageHeader
        title="Social links"
        description="Used in the footer, the contact page and the homepage social band. Also published as sameAs in the organisation's structured data."
        breadcrumbs={[{ label: 'Social links' }]}
      />

      <AdminBody className="flex flex-col gap-6">
        <Alert tone="info">
          A link appears on the site only when it is ticked <strong>and</strong> has a URL. Untick
          one to hide it without losing the address.
        </Alert>

        <AdminPanel title="Profiles">
          <SimpleForm action={saveSocialLinks} submitLabel="Save social links">
            {(state) => (
              <div className="flex flex-col gap-5">
                {links.map((link, index) => (
                  <div
                    key={link.id}
                    className="rounded-sm border border-beige bg-ivory-soft p-4"
                  >
                    <input type="hidden" name="platform" value={link.platform} />
                    <input type="hidden" name="label" value={link.label} />
                    <input type="hidden" name="sort_order" value={link.sort_order || index} />

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="flex items-center gap-2.5 text-[0.9375rem] font-medium text-earth">
                        <Icon
                          name={socialIconName(link.platform)}
                          size={18}
                          className="text-leaf"
                        />
                        {link.label}
                      </span>

                      <label className="flex cursor-pointer items-center gap-2 text-[0.8125rem] text-earth-soft">
                        <input
                          type="checkbox"
                          name="enabled"
                          value={link.platform}
                          defaultChecked={link.enabled}
                          className="h-4 w-4 accent-botanical"
                        />
                        Show on the site
                      </label>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-[2fr_1fr]">
                      <Field
                        label="Profile URL"
                        htmlFor={`url-${link.platform}`}
                        hint="Must be a full https:// address."
                        error={state.errors?.[`url_${link.platform}`]}
                      >
                        <Input
                          id={`url-${link.platform}`}
                          name="url"
                          type="url"
                          defaultValue={link.url}
                          placeholder={`https://${link.platform === 'x' ? 'x' : link.platform}.com/neyora`}
                          invalid={Boolean(state.errors?.[`url_${link.platform}`])}
                          className="font-mono text-[0.8125rem]"
                        />
                      </Field>

                      <Field
                        label="Handle"
                        htmlFor={`handle-${link.platform}`}
                        hint="Shown as the link text where there is room."
                      >
                        <Input
                          id={`handle-${link.platform}`}
                          name="handle"
                          defaultValue={link.handle ?? ''}
                          placeholder="@neyora"
                        />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SimpleForm>
        </AdminPanel>

        <AdminPanel
          title="WhatsApp"
          description="WhatsApp is configured in Site settings rather than here, because the number is used to generate wa.me links across the whole site, not just as a profile link."
        >
          <a
            href="/admin/settings"
            className="inline-flex h-10 items-center gap-2 rounded-xs border border-beige px-3.5 text-[0.8125rem] font-medium text-earth-soft transition-colors hover:border-forest/50 hover:text-forest"
          >
            Go to Site settings
            <Icon name="chevron-right" size={14} />
          </a>
        </AdminPanel>
      </AdminBody>
    </>
  )
}
