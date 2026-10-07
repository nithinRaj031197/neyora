import { LoadingBar, Skeleton } from '@/components/ui/LoadingBar'

/** The batch list, while the Batches tab is read. */
export default function Loading() {
  return (
    <>
      <h1 className="font-display text-[1.75rem] text-forest">All batches</h1>
      <LoadingBar label="Reading the farm workbook…" className="mt-5" />

      <div className="mt-6 grid animate-pulse gap-2.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-sm border border-beige bg-ivory p-4">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
            <Skeleton className="mt-3 h-3 w-56" />
          </div>
        ))}
      </div>
    </>
  )
}
