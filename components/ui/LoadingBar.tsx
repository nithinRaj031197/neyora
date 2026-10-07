import { cn } from '@/lib/utils/cn'

/**
 * A thin indeterminate progress bar, with its own announcement.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 *
 * Farm pages read Google Sheets on every request — there is no database and
 * no cache, because the spreadsheet is the source of truth. That read is
 * usually under a second but can take several, and until it returns the
 * browser sits on the PREVIOUS page with nothing moving. The admin cannot
 * tell a slow read from a tap that did not register, so they tap again.
 *
 * ── WHY IT CARRIES ITS OWN LABEL ──────────────────────────────────────────
 *
 * The bar is `aria-hidden` and the text beside it does the talking, in one
 * polite live region. A skeleton screen that announced each of its twenty
 * grey boxes would be unusable; one "Loading the farm workbook" is the whole
 * message. `role="status"` rather than `alert` — this is not urgent, and it
 * must not interrupt whatever is being read.
 *
 * No client JavaScript: the animation is CSS, so this renders inside a
 * `loading.tsx` server component and is already moving while the server is
 * still waiting on Google.
 */
export function LoadingBar({
  label,
  className,
}: {
  /** What is being waited for. Written for someone who cannot see the bar. */
  label: string
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        aria-hidden="true"
        className="progress-linear h-0.5 flex-1 rounded-full"
      />
      <p role="status" className="shrink-0 text-[0.75rem] text-earth-muted">
        {label}
      </p>
    </div>
  )
}

/** A grey block standing in for content that has not arrived. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('rounded-xs bg-beige-soft', className)} />
}
