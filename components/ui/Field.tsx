'use client'

import * as RadixLabel from '@radix-ui/react-label'
import { createContext, useContext, useId, type ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

/**
 * Form fields.
 *
 * `Field` owns the parts that are easy to forget and invisible when missing:
 * the generated id, the label association, `aria-invalid`, and the
 * `aria-describedby` wiring that makes a screen reader read the hint — or the
 * error instead of it — when focus lands on the control.
 *
 * The control reads all of that from context rather than being handed it, so a
 * field cannot be half-wired: there is no prop to forget to pass.
 */

interface FieldContext {
  id: string
  describedBy?: string
  invalid: boolean
}

const Ctx = createContext<FieldContext | null>(null)

function useField(): FieldContext {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('Input and Textarea must be used inside <Field>')
  return ctx
}

export function Field({
  label,
  hint,
  error,
  /** A quiet right-aligned annotation, e.g. where the current value comes from. */
  note,
  children,
  className,
}: {
  label: string
  hint?: string
  error?: string
  note?: ReactNode
  children: ReactNode
  className?: string
}) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`

  /*
   * The error replaces the hint rather than joining it. Two descriptions read
   * back-to-back is how a screen reader user ends up hearing the formatting
   * advice they already followed before they hear what went wrong.
   */
  const describedBy = error ? errorId : hint ? hintId : undefined

  return (
    <Ctx.Provider value={{ id, describedBy, invalid: Boolean(error) }}>
      <div className={cn('grid gap-1.5', className)}>
        <div className="flex items-baseline justify-between gap-3">
          <RadixLabel.Root htmlFor={id} className="text-[0.8125rem] font-medium text-earth-soft">
            {label}
          </RadixLabel.Root>
          {note ? <span className="text-[0.6875rem] text-earth-muted">{note}</span> : null}
        </div>

        {children}

        {error ? (
          <p id={errorId} className="flex items-start gap-1.5 text-[0.8125rem] text-danger">
            {error}
          </p>
        ) : hint ? (
          <p id={hintId} className="text-[0.8125rem] leading-relaxed text-earth-muted">
            {hint}
          </p>
        ) : null}
      </div>
    </Ctx.Provider>
  )
}

/**
 * Focus is a 2px leaf ring with an offset, not a removed outline and a border
 * colour change — a border change alone is invisible to anyone with a contrast
 * loss, and is the single most common accessibility regression in a redesign.
 */
const CONTROL = cn(
  'w-full rounded-xs border bg-ivory text-[0.9375rem] text-earth',
  'placeholder:text-earth-muted/55',
  'transition-[border-color,box-shadow] duration-200 ease-(--ease-out-soft)',
  'hover:border-earth-muted/45',
  'focus-visible:border-leaf focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-leaf',
  'disabled:cursor-not-allowed disabled:bg-beige-soft/50 disabled:text-earth-muted',
)

const STATE = (invalid: boolean) => (invalid ? 'border-danger' : 'border-beige')

export function Input({
  className,
  prefix,
  ...rest
}: Omit<React.ComponentProps<'input'>, 'id' | 'prefix'> & { prefix?: string }) {
  const { id, describedBy, invalid } = useField()

  const input = (
    <input
      id={id}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className={cn(CONTROL, STATE(invalid), 'h-12', prefix ? 'pr-3.5 pl-9' : 'px-3.5', className)}
      {...rest}
    />
  )

  if (!prefix) return input

  // A currency mark belongs inside the control, not in the label — it tells you
  // the unit at the moment you are typing the number.
  return (
    <div className="relative">
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[0.9375rem] text-earth-muted"
      >
        {prefix}
      </span>
      {input}
    </div>
  )
}

export function Textarea({ className, ...rest }: Omit<React.ComponentProps<'textarea'>, 'id'>) {
  const { id, describedBy, invalid } = useField()
  return (
    <textarea
      id={id}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className={cn(CONTROL, STATE(invalid), 'px-3.5 py-3 leading-relaxed', className)}
      {...rest}
    />
  )
}
