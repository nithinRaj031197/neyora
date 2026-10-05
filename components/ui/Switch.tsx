'use client'

import * as RadixSwitch from '@radix-ui/react-switch'
import { cn } from '@/lib/utils/cn'

/**
 * A switch, not a checkbox: it takes effect on its own rather than describing
 * a value to be submitted later. Radix supplies `role="switch"` with the
 * checked state, keyboard operation, and the hidden input that carries the
 * value when one is inside a form.
 *
 * Colour alone never carries the state — the thumb also travels, which is what
 * makes it readable to anyone who cannot distinguish forest from beige.
 */
export function Switch({ className, ...rest }: React.ComponentProps<typeof RadixSwitch.Root>) {
  return (
    <RadixSwitch.Root
      className={cn(
        'press relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-200 ease-(--ease-out-soft)',
        'border-beige bg-beige-soft',
        'data-[state=checked]:border-forest data-[state=checked]:bg-forest',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...rest}
    >
      <RadixSwitch.Thumb
        className={cn(
          'block size-5 translate-x-0.5 rounded-full bg-ivory shadow-[0_1px_3px_rgb(20_18_15_/_0.28)]',
          'transition-transform duration-200 ease-(--ease-spring-soft)',
          'data-[state=checked]:translate-x-[1.375rem]',
        )}
      />
    </RadixSwitch.Root>
  )
}
