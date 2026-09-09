import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

/**
 * Form primitives shared by the public forms and the whole admin.
 *
 * `Field` is the accessibility contract in one place: a real <label> bound by
 * `htmlFor`, hint and error text wired through `aria-describedby`, and
 * `aria-invalid` on the control. Getting that right once means every form in
 * the app is accessible by construction rather than by review.
 */
export function Field({
  label,
  htmlFor,
  children,
  hint,
  error,
  required,
  className,
}: {
  label: string
  htmlFor: string
  children: ReactNode
  hint?: string
  error?: string
  required?: boolean
  className?: string
}) {
  const hintId = hint ? `${htmlFor}-hint` : undefined
  const errorId = error ? `${htmlFor}-error` : undefined

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={htmlFor} className="text-[0.8125rem] font-medium text-earth">
        {label}
        {required ? (
          <span className="ml-1 text-danger" aria-hidden="true">
            *
          </span>
        ) : (
          <span className="sr-only"> (optional)</span>
        )}
      </label>

      {/* aria-describedby is applied by the caller via the ids below. */}
      <div data-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}>
        {children}
      </div>

      {hint && !error ? (
        <p id={hintId} className="text-[0.75rem] leading-relaxed text-earth-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-[0.75rem] leading-relaxed text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}

const CONTROL = cn(
  'w-full rounded-xs border bg-ivory px-3.5 text-[0.9375rem] text-earth',
  'placeholder:text-earth-muted',
  'transition-colors duration-150',
  'focus:border-botanical focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-leaf',
  'disabled:cursor-not-allowed disabled:bg-beige-soft disabled:text-earth-muted',
)

export function Input({
  invalid,
  className,
  ...props
}: ComponentProps<'input'> & { invalid?: boolean }) {
  return (
    <input
      {...props}
      aria-invalid={invalid || undefined}
      aria-describedby={
        props.id ? `${props.id}-hint ${props.id}-error`.trim() : props['aria-describedby']
      }
      className={cn(CONTROL, 'h-11', invalid ? 'border-danger' : 'border-beige', className)}
    />
  )
}

export function Textarea({
  invalid,
  className,
  ...props
}: ComponentProps<'textarea'> & { invalid?: boolean }) {
  return (
    <textarea
      {...props}
      aria-invalid={invalid || undefined}
      aria-describedby={
        props.id ? `${props.id}-hint ${props.id}-error`.trim() : props['aria-describedby']
      }
      className={cn(
        CONTROL,
        'resize-y py-3 leading-relaxed',
        invalid ? 'border-danger' : 'border-beige',
        className,
      )}
    />
  )
}

export function Select({
  invalid,
  className,
  children,
  ...props
}: ComponentProps<'select'> & { invalid?: boolean }) {
  return (
    <select
      {...props}
      aria-invalid={invalid || undefined}
      className={cn(
        CONTROL,
        'h-11 cursor-pointer appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%232B2923\' stroke-width=\'1.5\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E")] bg-[length:18px] bg-[right_0.75rem_center] bg-no-repeat pr-10',
        invalid ? 'border-danger' : 'border-beige',
        className,
      )}
    >
      {children}
    </select>
  )
}

export function Checkbox({
  label,
  hint,
  className,
  ...props
}: ComponentProps<'input'> & { label: string; hint?: string }) {
  return (
    <label className={cn('flex cursor-pointer items-start gap-3', className)}>
      <input
        {...props}
        type="checkbox"
        className="mt-0.5 h-4.5 w-4.5 shrink-0 accent-botanical"
      />
      <span>
        <span className="block text-[0.875rem] text-earth">{label}</span>
        {hint ? (
          <span className="mt-0.5 block text-[0.75rem] leading-relaxed text-earth-muted">
            {hint}
          </span>
        ) : null}
      </span>
    </label>
  )
}

export function FieldGroup({
  legend,
  description,
  children,
  className,
}: {
  legend: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <fieldset className={cn('flex flex-col gap-5', className)}>
      <div>
        <legend className="font-sans text-[0.75rem] font-semibold tracking-[0.14em] text-earth-soft uppercase">
          {legend}
        </legend>
        {description ? (
          <p className="mt-1.5 max-w-[60ch] text-[0.8125rem] leading-relaxed text-earth-muted">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </fieldset>
  )
}
