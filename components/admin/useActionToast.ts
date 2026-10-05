'use client'

import { useEffect, useRef } from 'react'
import { useToast } from '@/components/ui/Toast'

type ActionState = { status: string; message?: string }

/**
 * Announce the result of a `useActionState` form as a toast.
 *
 * Fires on the *identity* of the state object, not on its contents. Saving
 * twice with no change returns `{ status: 'saved' }` both times, and a value
 * comparison would silently swallow the second confirmation — which reads to
 * the user as the save having failed.
 *
 * `useActionState` keeps one object until an action resolves, so identity is
 * exactly "a new result arrived". The copy is in the dependency list for
 * correctness, but a change to it alone cannot replay a toast: the identity
 * guard below returns first.
 */
export function useActionToast(
  state: ActionState,
  { title, description }: { title: string; description?: string },
) {
  const { toast } = useToast()
  const seen = useRef<ActionState>(state)

  useEffect(() => {
    if (state === seen.current) return
    seen.current = state

    if (state.status === 'saved') {
      toast({ tone: 'success', title, description })
    } else if (state.status === 'error') {
      toast({
        tone: 'error',
        title: 'Not saved',
        description: state.message ?? 'Something went wrong. Please try again.',
      })
    }
  }, [state, toast, title, description])
}
