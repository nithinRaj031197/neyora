/**
 * Admin loading skeleton.
 *
 * A single quiet block rather than a facsimile of the page. Admin screens
 * differ too much from each other for a shared skeleton to be honest about
 * what is coming.
 */
export default function AdminLoading() {
  return (
    <div className="animate-pulse">
      <p role="status" className="sr-only">
        Loading
      </p>
      <div aria-hidden="true" className="border-b border-beige bg-ivory px-5 py-7 lg:px-8">
        <div className="h-3 w-28 rounded-xs bg-beige-soft" />
        <div className="mt-4 h-8 w-64 rounded-xs bg-beige-soft" />
        <div className="mt-3 h-3.5 w-full max-w-lg rounded-xs bg-beige-soft" />
      </div>
      <div aria-hidden="true" className="px-5 py-8 lg:px-8">
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-14 rounded-sm border border-beige bg-ivory" />
          ))}
        </div>
      </div>
    </div>
  )
}
