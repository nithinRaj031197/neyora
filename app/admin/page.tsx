import Link from 'next/link'
import { AdminBody, AdminPageHeader, AdminPanel } from '@/components/admin/AdminShell'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Icon, type IconName } from '@/components/ui/Icon'
import { requireAdmin } from '@/lib/auth/session'
import { getDashboardStats } from '@/lib/content/admin'
import { getSiteSettings } from '@/lib/content/site'
import { formatDateTime, relativeTime } from '@/lib/utils/format'
import { hasServiceRole } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

function Stat({
  label,
  value,
  hint,
  href,
  icon,
}: {
  label: string
  value: string | number
  hint?: string
  href?: string
  icon: IconName
}) {
  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.6875rem] font-semibold tracking-[0.14em] text-earth-muted uppercase">
          {label}
        </p>
        <Icon name={icon} size={17} className="text-leaf" />
      </div>
      <p className="mt-3 font-display text-[2rem] leading-none text-forest tabular-nums">{value}</p>
      {hint ? <p className="mt-2 text-[0.75rem] text-earth-muted">{hint}</p> : null}
    </>
  )

  const classes =
    'block rounded-sm border border-beige bg-ivory px-5 py-4 transition-colors hover:border-forest/40'

  return href ? (
    <Link href={href} className={classes}>
      {inner}
    </Link>
  ) : (
    <div className={classes}>{inner}</div>
  )
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const session = await requireAdmin('/admin')
  const [stats, settings, sp] = await Promise.all([
    getDashboardStats(),
    getSiteSettings(),
    searchParams,
  ])

  const firstName = session.admin.full_name?.split(' ')[0] ?? null

  // Configuration gaps worth surfacing on arrival rather than discovering
  // later when a button silently does nothing.
  const warnings: { title: string; body: string; href?: string; label?: string }[] = []
  if (!hasServiceRole()) {
    warnings.push({
      title: 'SUPABASE_SERVICE_ROLE_KEY is not set',
      body: 'The contact form, QR scan counters, analytics and granting CMS access to new users all need it. Add it to your server environment and redeploy.',
    })
  }
  if (!settings.whatsapp_number) {
    warnings.push({
      title: 'No WhatsApp number configured',
      body: 'WhatsApp buttons are hidden across the site until you add one.',
      href: '/admin/settings',
      label: 'Add it in Site settings',
    })
  }
  if (process.env.ADMIN_SETUP_TOKEN) {
    warnings.push({
      title: 'ADMIN_SETUP_TOKEN is still set',
      body: 'Setup is complete, so this secret has no further use. Remove it from your host — an unused secret is still a secret worth deleting.',
    })
  }

  return (
    <>
      <AdminPageHeader
        title={firstName ? `Welcome back, ${firstName}` : 'Dashboard'}
        description="Everything on the public website is edited from here. You should never need to touch the source code to change content."
      />

      <AdminBody size="wide" className="flex flex-col gap-6">
        {sp.error === 'insufficient-permissions' ? (
          <Alert tone="warning" title="Not available to your role">
            That section needs admin or owner permissions. Ask an owner if you need access.
          </Alert>
        ) : null}

        {warnings.map((warning) => (
          <Alert key={warning.title} tone="warning" title={warning.title}>
            {warning.body}
            {warning.href ? (
              <>
                {' '}
                <Link
                  href={warning.href}
                  className="underline decoration-warning/50 underline-offset-2 hover:decoration-warning"
                >
                  {warning.label}
                </Link>
                .
              </>
            ) : null}
          </Alert>
        ))}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Published recipes"
            value={stats.recipes.published}
            hint={`${stats.recipes.drafts} draft${stats.recipes.drafts === 1 ? '' : 's'}, ${stats.recipes.scheduled} scheduled`}
            href="/admin/recipes"
            icon="flame"
          />
          <Stat
            label="Published products"
            value={stats.products.published}
            hint={`${stats.products.total} in total`}
            href="/admin/products"
            icon="leaf"
          />
          <Stat
            label="Media library"
            value={stats.media}
            hint="Images available to reuse"
            href="/admin/media"
            icon="image"
          />
          <Stat
            label="New messages"
            value={stats.newMessages}
            hint={stats.newMessages > 0 ? 'Waiting for a reply' : 'Nothing waiting'}
            href="/admin/messages"
            icon="mail"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <AdminPanel
            title="Pack QR code"
            description="The QR printed on your packaging points at /go. Change where it leads here — never reprint a label."
            actions={
              <Link
                href="/admin/redirects"
                className="inline-flex h-9 items-center gap-1.5 rounded-xs border border-beige px-3 text-[0.75rem] font-medium text-earth-soft transition-colors hover:border-forest/50 hover:text-forest"
              >
                Manage
                <Icon name="chevron-right" size={13} />
              </Link>
            }
          >
            {stats.qr ? (
              <dl className="flex flex-col gap-4">
                <div>
                  <dt className="text-[0.6875rem] font-semibold tracking-[0.14em] text-earth-muted uppercase">
                    Currently goes to
                  </dt>
                  <dd className="mt-1.5 font-mono text-[0.9375rem] text-forest">
                    {stats.qr.destination}
                  </dd>
                </div>
                <div className="flex flex-wrap gap-x-10 gap-y-3">
                  <div>
                    <dt className="text-[0.6875rem] font-semibold tracking-[0.14em] text-earth-muted uppercase">
                      Total scans
                    </dt>
                    <dd className="mt-1.5 font-display text-xl text-forest tabular-nums">
                      {stats.qr.scans.toLocaleString('en-GB')}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[0.6875rem] font-semibold tracking-[0.14em] text-earth-muted uppercase">
                      Last scan
                    </dt>
                    <dd className="mt-1.5 text-[0.875rem] text-earth-soft">
                      {stats.qr.lastScanAt ? formatDateTime(stats.qr.lastScanAt) : 'Not yet scanned'}
                    </dd>
                  </div>
                </div>
              </dl>
            ) : (
              <p className="text-[0.875rem] text-earth-soft">
                No <code className="font-mono">/go</code> redirect is configured yet. Create one so
                the QR on your packaging has somewhere to land.
              </p>
            )}
          </AdminPanel>

          <AdminPanel
            title="Most-read recipes"
            description="Counted server-side, without cookies or personal data."
          >
            {stats.topRecipes.length === 0 ? (
              <p className="text-[0.875rem] text-earth-soft">
                No views recorded yet. Numbers appear once the site has visitors.
              </p>
            ) : (
              <ol className="flex flex-col">
                {stats.topRecipes.map((recipe, index) => (
                  <li
                    key={recipe.slug}
                    className="flex items-center justify-between gap-4 border-b border-beige/70 py-2.5 last:border-b-0"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="font-display text-[0.875rem] text-leaf tabular-nums">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <Link
                        href={`/recipes/${recipe.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-w-0 truncate text-[0.875rem] text-earth transition-colors hover:text-botanical"
                      >
                        {recipe.title}
                      </Link>
                    </span>
                    <span className="shrink-0 text-[0.8125rem] text-earth-muted tabular-nums">
                      {recipe.views.toLocaleString('en-GB')}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </AdminPanel>
        </div>

        <AdminPanel
          title="Common tasks"
          description="The things you are most likely to want to change."
        >
          <ul className="grid gap-px overflow-hidden rounded-xs border border-beige bg-beige sm:grid-cols-2 lg:grid-cols-3">
            {[
              { href: '/admin/recipes/new', label: 'Write a new recipe', icon: 'plus' as const },
              { href: '/admin/homepage', label: 'Edit the homepage', icon: 'image' as const },
              { href: '/admin/redirects', label: 'Change where the pack QR goes', icon: 'qr' as const },
              { href: '/admin/social', label: 'Update social links', icon: 'instagram' as const },
              { href: '/admin/pages', label: 'Rewrite the farm story', icon: 'link' as const },
              { href: '/admin/media', label: 'Upload photography', icon: 'image' as const },
            ].map((task) => (
              <li key={task.href}>
                <Link
                  href={task.href}
                  className="flex h-full items-center gap-3 bg-ivory px-4 py-3.5 text-[0.875rem] text-earth transition-colors hover:bg-ivory-soft"
                >
                  <Icon name={task.icon} size={16} className="text-leaf" />
                  {task.label}
                </Link>
              </li>
            ))}
          </ul>
        </AdminPanel>

        <p className="text-[0.75rem] text-earth-muted">
          Signed in as {session.admin.email} ({session.admin.role}) · session last seen{' '}
          {relativeTime(session.admin.updated_at)}
          {stats.recipes.scheduled > 0 ? (
            <>
              {' · '}
              <Badge tone="warning">
                {stats.recipes.scheduled} scheduled recipe
                {stats.recipes.scheduled === 1 ? '' : 's'} will publish automatically
              </Badge>
            </>
          ) : null}
        </p>
      </AdminBody>
    </>
  )
}
