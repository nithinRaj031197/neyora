'use client'

import { Button } from '@/components/ui/Button'

/**
 * A submit button that asks first.
 *
 * `window.confirm` rather than a modal, deliberately: it cannot be missed, it
 * cannot be dismissed by a stray tap, it is keyboard-accessible everywhere,
 * and it needs no focus trap to get right. A custom dialog here would be more
 * code and less reliable for a question asked a few times a week.
 *
 * Cancelling the confirm calls `preventDefault`, so the form never submits.
 */
export function ConfirmButton({
  confirm,
  children,
  ...rest
}: { confirm: string } & React.ComponentProps<typeof Button>) {
  return (
    <Button
      type="submit"
      {...rest}
      onClick={(event) => {
        if (!window.confirm(confirm)) event.preventDefault()
      }}
    >
      {children}
    </Button>
  )
}
