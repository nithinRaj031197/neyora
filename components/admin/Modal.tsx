'use client'

import { useEffect, useRef } from 'react'
import { Icon } from '@/components/ui/Icon'

/**
 * Modal dialog built on the native <dialog> element.
 *
 * The browser gives us the focus trap, the Escape handler, the inert
 * background and the top-layer stacking for free — all the parts a
 * hand-rolled modal usually gets wrong.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'default',
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children?: React.ReactNode
  footer?: React.ReactNode
  size?: 'default' | 'wide'
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      // Escape fires 'cancel'; both paths must tell React the dialog closed.
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClose={onClose}
      aria-labelledby="modal-title"
      aria-describedby={description ? 'modal-description' : undefined}
      className={`m-auto w-[calc(100vw-2rem)] rounded-sm border border-beige bg-ivory p-0 text-earth backdrop:bg-earth/55 ${
        size === 'wide' ? 'max-w-3xl' : 'max-w-lg'
      }`}
    >
      <div className="flex items-start justify-between gap-6 border-b border-beige px-6 py-4">
        <div>
          <h2 id="modal-title" className="font-display text-xl text-forest">
            {title}
          </h2>
          {description ? (
            <p id="modal-description" className="mt-1.5 text-[0.875rem] text-earth-soft">
              {description}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="-mt-1 -mr-2 grid h-9 w-9 place-items-center rounded-xs text-earth-muted transition-colors hover:bg-earth/5 hover:text-earth"
        >
          <Icon name="plus" size={16} className="rotate-45" />
        </button>
      </div>

      {children ? <div className="max-h-[65vh] overflow-y-auto px-6 py-5">{children}</div> : null}

      {footer ? (
        <div className="flex flex-wrap justify-end gap-3 border-t border-beige px-6 py-4">
          {footer}
        </div>
      ) : null}
    </dialog>
  )
}
