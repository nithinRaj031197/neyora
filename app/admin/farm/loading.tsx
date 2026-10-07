import { LoadingBar, Skeleton } from '@/components/ui/LoadingBar'

/**
 * Shown the moment the Farm tab is tapped, while the server reads the
 * workbook. Next streams this immediately and swaps in the real page when the
 * read returns — so navigation feels instant even though Google does not.
 *
 * The skeleton mirrors the real page's blocks (eight KPI cards, five action
 * rows, two charts) so nothing jumps when the content lands. It is the
 * dashboard's shape, not a generic spinner, because a shape that matches
 * tells the admin they tapped the right thing.
 */
export default function Loading() {
  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-[1.75rem] text-forest">Farm</h1>
      </div>

      <LoadingBar label="Reading the farm workbook…" className="mt-5" />

      <div className="mt-6 animate-pulse">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-sm border border-beige bg-ivory p-4">
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="mt-3 h-6 w-16" />
              <Skeleton className="mt-2 h-2.5 w-24" />
            </div>
          ))}
        </div>

        <Skeleton className="mt-9 h-2.5 w-32" />
        <div className="mt-3 grid gap-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 rounded-sm border border-beige bg-ivory" />
          ))}
        </div>

        <Skeleton className="mt-9 h-2.5 w-28" />
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-sm border border-beige bg-ivory p-4">
              <Skeleton className="h-2.5 w-28" />
              <Skeleton className="mt-4 h-32 w-full" />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
