'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { signIn } from '@/lib/actions/auth'
import { IDLE } from '@/lib/actions/state'
import { Field, Input } from '@/components/ui/Form'
import { Alert } from '@/components/ui/Alert'

function Submit() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-12 w-full items-center justify-center rounded-xs border border-forest bg-forest px-5 text-[0.875rem] font-medium tracking-[0.06em] text-ivory uppercase transition-colors hover:bg-forest-soft disabled:pointer-events-none disabled:opacity-50"
    >
      {pending ? 'Signing in…' : 'Sign in'}
    </button>
  )
}

export function SignInForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(signIn, IDLE)

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {state.status === 'error' && state.message ? (
        <Alert tone="danger">{state.message}</Alert>
      ) : null}

      <input type="hidden" name="next" value={next ?? '/admin'} />

      <Field label="Email" htmlFor="email" required error={state.errors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          invalid={Boolean(state.errors?.email)}
        />
      </Field>

      <Field label="Password" htmlFor="password" required error={state.errors?.password}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          invalid={Boolean(state.errors?.password)}
        />
      </Field>

      <Submit />
    </form>
  )
}
