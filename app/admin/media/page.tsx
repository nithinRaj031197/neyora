import Link from 'next/link'
import { AdminBody, AdminPageHeader, AdminPanel } from '@/components/admin/AdminShell'
import { MediaLibrary } from '@/components/admin/MediaLibrary'
import { SearchFilter } from '@/components/admin/SearchFilter'
import { Pagination } from '@/components/ui/Pagination'
import { requireAdmin } from '@/lib/auth/session'
import { listAdminMedia, listMediaFolders } from '@/lib/content/admin'
import { formatBytes } from '@/lib/utils/format'

export const dynamic = 'force-dynamic'

export default async function AdminMediaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; folder?: string; page?: string }>
}) {
  await requireAdmin('/admin/media')
  const sp = await searchParams

  const [result, folders] = await Promise.all([
    listAdminMedia({ search: sp.q, folder: sp.folder, page: Number(sp.page) || 1 }),
    listMediaFolders(),
  ])

  const missingAlt = result.rows.filter((m) => !m.alt?.trim()).length
  const totalBytes = result.rows.reduce((sum, m) => sum + (m.size_bytes ?? 0), 0)

  return (
    <>
      <AdminPageHeader
        title="Media library"
        description="Images are resized in your browser to WebP at four widths before upload, so pages stay fast without a paid image service."
        breadcrumbs={[{ label: 'Media' }]}
      />

      <AdminBody size="wide" className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <SearchFilter basePath="/admin/media" placeholder="Search by name or alt text" />

          {folders.length > 1 ? (
            <nav aria-label="Filter by folder" className="flex flex-wrap gap-2">
              <Link
                href="/admin/media"
                aria-current={!sp.folder ? 'page' : undefined}
                className={`inline-flex h-9 items-center rounded-xs border px-3 text-[0.75rem] font-medium tracking-[0.04em] uppercase transition-colors ${
                  !sp.folder
                    ? 'border-forest bg-forest text-ivory'
                    : 'border-beige text-earth-soft hover:border-forest/50'
                }`}
              >
                All
              </Link>
              {folders.map((folder) => (
                <Link
                  key={folder}
                  href={`/admin/media?folder=${folder}`}
                  aria-current={sp.folder === folder ? 'page' : undefined}
                  className={`inline-flex h-9 items-center rounded-xs border px-3 text-[0.75rem] font-medium tracking-[0.04em] uppercase transition-colors ${
                    sp.folder === folder
                      ? 'border-forest bg-forest text-ivory'
                      : 'border-beige text-earth-soft hover:border-forest/50'
                  }`}
                >
                  {folder}
                </Link>
              ))}
            </nav>
          ) : null}
        </div>

        <AdminPanel title="Upload">
          <MediaLibrary
            media={result.rows}
            folder={sp.folder ?? 'general'}
            uploadOnly
          />
        </AdminPanel>

        <p className="text-[0.8125rem] text-earth-muted">
          {result.total} image{result.total === 1 ? '' : 's'} · {formatBytes(totalBytes)} on this
          page
          {missingAlt > 0 ? (
            <span className="text-warning">
              {' '}
              · {missingAlt} missing alt text
            </span>
          ) : null}
        </p>

        <MediaLibrary media={result.rows} folder={sp.folder ?? 'general'} />

        <Pagination
          page={result.page}
          pageSize={result.pageSize}
          total={result.total}
          basePath="/admin/media"
          params={{ q: sp.q, folder: sp.folder }}
        />
      </AdminBody>
    </>
  )
}
