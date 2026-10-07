import { LoadingBar, Skeleton } from '@/components/ui/LoadingBar'

/**
 * One batch, while the workbook is read.
 *
 * The batch id is not known here — `loading.tsx` receives no params — so the
 * heading is a placeholder rather than a guess. Inventing the id from the URL
 * would mean rendering a title for a batch that may not exist.
 */
export default function Loading() {
  return (
    <>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-4 h-7 w-56" />
      <LoadingBar label="Reading the batch…" className="mt-5" />

      <div className="mt-6 grid animate-pulse gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-sm border border-beige bg-ivory p-4">
            <Skeleton className="h-2.5 w-24" />
            <div className="mt-4 grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((__, j) => (
                <div key={j}>
                  <Skeleton className="h-2.5 w-20" />
                  <Skeleton className="mt-2 h-5 w-16" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
