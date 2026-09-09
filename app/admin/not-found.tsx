import Link from 'next/link'

export default function AdminNotFound() {
  return (
    <div className="px-5 py-14 lg:px-8">
      <div className="max-w-xl">
        <p className="text-[0.6875rem] font-semibold tracking-[0.16em] text-earth-muted uppercase">
          404
        </p>
        <h1 className="mt-3 font-display text-[1.75rem] text-forest">Not found in the CMS</h1>
        <p className="mt-4 text-[0.9375rem] leading-relaxed text-earth-soft">
          The record may have been deleted, or the link may be out of date.
        </p>
        <Link
          href="/admin"
          className="mt-7 inline-flex h-11 items-center rounded-xs border border-forest bg-forest px-5 text-[0.8125rem] font-medium tracking-[0.06em] text-ivory uppercase transition-colors hover:bg-forest-soft"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}
