'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { Alert } from '@/components/ui/Alert'
import { IDLE, type ActionState } from '@/lib/actions/state'
import { useActionToast } from './Toast'
import { cn } from '@/lib/utils/cn'

function Submit({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 items-center rounded-xs border border-forest bg-forest px-5 text-[0.8125rem] font-medium tracking-[0.06em] text-ivory uppercase transition-colors hover:bg-forest-soft disabled:pointer-events-none disabled:opacity-50"
    >
      {pending ? pendingLabel : label}
    </button>
  )
}

/**
 * Wraps a Server Action in a form with error display, a submit button and a
 * toast on completion.
 *
 * The `children` render prop receives the current state so each field can show
 * its own error — the same messages Zod produced server-side, so the client
 * never invents validation of its own.
 */
export function SimpleForm({
  action,
  children,
  submitLabel = 'Save',
  pendingLabel = 'Saving…',
  cancelHref,
  className,
  footerNote,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>
  children: (state: ActionState) => React.ReactNode
  submitLabel?: string
  pendingLabel?: string
  cancelHref?: string
  className?: string
  footerNote?: string
}) {
  const [state, formAction] = useActionState(action, IDLE)
  useActionToast(state)

  return (
    <form action={formAction} className={cn('flex flex-col gap-5', className)} noValidate>
      {state.status === 'error' && state.message ? (
        <Alert tone="danger" title="Not saved">
          {state.message}
        </Alert>
      ) : null}
      {state.status === 'success' && state.message ? (
        <Alert tone="success">{state.message}</Alert>
      ) : null}

      {children(state)}

      <div className="flex flex-wrap items-center gap-3 border-t border-beige pt-5">
        <Submit label={submitLabel} pendingLabel={pendingLabel} />
        {cancelHref ? (
          <Link
            href={cancelHref}
            className="inline-flex h-11 items-center rounded-xs border border-beige px-4 text-[0.8125rem] font-medium tracking-[0.04em] text-earth-soft uppercase transition-colors hover:border-forest/50 hover:text-forest"
          >
            Cancel
          </Link>
        ) : null}
        {footerNote ? (
          <p className="text-[0.75rem] leading-relaxed text-earth-muted">{footerNote}</p>
        ) : null}
      </div>
    </form>
  )
}
