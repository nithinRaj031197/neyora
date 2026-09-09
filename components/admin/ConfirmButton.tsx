'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Modal } from './Modal'
import { cn } from '@/lib/utils/cn'

function Submit({ label, tone }: { label: string; tone: 'danger' | 'primary' }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        'inline-flex h-10 items-center rounded-xs border px-4 text-[0.8125rem] font-medium tracking-[0.04em] uppercase transition-colors disabled:pointer-events-none disabled:opacity-50',
        tone === 'danger'
          ? 'border-danger bg-danger text-ivory hover:bg-danger/90'
          : 'border-forest bg-forest text-ivory hover:bg-forest-soft',
      )}
    >
      {pending ? 'Working…' : label}
    </button>
  )
}

/**
 * A destructive action behind a confirmation dialog.
 *
 * The action itself is a real <form> POST to a Server Action, so it works
 * without JavaScript; the dialog is the enhancement. Deletes in this CMS are
 * soft, and the copy says so — an editor should know whether "delete" means
 * "recoverable".
 */
export function ConfirmButton({
  action,
  hiddenFields,
  triggerLabel,
  title,
  description,
  confirmLabel = 'Delete',
  tone = 'danger',
  triggerClassName,
}: {
  action: (formData: FormData) => void | Promise<void>
  hiddenFields?: Record<string, string>
  triggerLabel: string
  title: string
  description: string
  confirmLabel?: string
  tone?: 'danger' | 'primary'
  triggerClassName?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          triggerClassName ??
          'inline-flex h-9 items-center rounded-xs border border-beige px-3 text-[0.75rem] font-medium tracking-[0.04em] text-danger uppercase transition-colors hover:border-danger hover:bg-danger/6'
        }
      >
        {triggerLabel}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        description={description}
        footer={
          <form action={action} onSubmit={() => setOpen(false)} className="flex gap-3">
            {Object.entries(hiddenFields ?? {}).map(([key, value]) => (
              <input key={key} type="hidden" name={key} value={value} />
            ))}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-10 items-center rounded-xs border border-beige px-4 text-[0.8125rem] font-medium tracking-[0.04em] text-earth-soft uppercase transition-colors hover:border-forest/50 hover:text-forest"
            >
              Cancel
            </button>
            <Submit label={confirmLabel} tone={tone} />
          </form>
        }
      />
    </>
  )
}
