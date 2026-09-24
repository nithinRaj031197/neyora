'use client'

import { useActionState } from 'react'
import { signIn, type LoginState } from '@/lib/auth/actions'

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, { status: 'idle' })
  const field =
    'h-12 w-full rounded-xs border border-beige bg-ivory px-3.5 text-[0.9375rem] text-earth ' +
    'focus-visible:outline-2 focus-visible:outline-leaf'

  return (
    <form action={action} className="mt-6 grid gap-3">
      <div>
        <label htmlFor="email" className="text-[0.8125rem] text-earth-soft">Email</label>
        <input id="email" name="email" type="email" required autoComplete="username" className={`${field} mt-1.5`} />
      </div>
      <div>
        <label htmlFor="password" className="text-[0.8125rem] text-earth-soft">Password</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className={`${field} mt-1.5`} />
      </div>

      {state.status === 'error' ? (
        <p role="alert" className="rounded-xs bg-danger/10 px-3.5 py-2.5 text-[0.875rem] text-danger">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="press mt-2 h-12 rounded-xs border border-forest bg-forest text-[0.875rem] font-medium tracking-[0.06em] text-ivory uppercase hover:bg-forest-soft disabled:opacity-60"
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
