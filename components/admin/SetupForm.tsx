'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useFormStatus } from 'react-dom'
import { completeAdminSetup } from '@/lib/actions/auth'
import { IDLE } from '@/lib/actions/state'
import { Field, Input } from '@/components/ui/Form'
import { Alert } from '@/components/ui/Alert'

function Submit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="inline-flex h-12 items-center justify-center rounded-xs border border-forest bg-forest px-6 text-[0.875rem] font-medium tracking-[0.06em] text-ivory uppercase transition-colors hover:bg-forest-soft disabled:pointer-events-none disabled:opacity-50"
    >
      {pending ? 'Setting up…' : 'Make me the owner'}
    </button>
  )
}

export function SetupForm({ disabled }: { disabled: boolean }) {
  const [state, formAction] = useActionState(completeAdminSetup, IDLE)
  const router = useRouter()

  // The layout only renders the sidebar once an admin row exists, so a full
  // refresh is what turns this page into the dashboard.
  useEffect(() => {
    if (state.status !== 'success') return
    const timer = window.setTimeout(() => {
      router.refresh()
      router.push('/admin')
    }, 900)
    return () => window.clearTimeout(timer)
  }, [state.status, state.nonce, router])

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {state.status === 'error' && state.message ? (
        <Alert tone="danger">{state.message}</Alert>
      ) : null}
      {state.status === 'success' && state.message ? (
        <Alert tone="success">{state.message}</Alert>
      ) : null}

      <Field
        label="Setup token"
        htmlFor="token"
        required
        hint="The value of ADMIN_SETUP_TOKEN in your server environment."
        error={state.errors?.token}
      >
        <Input
          id="token"
          name="token"
          type="password"
          autoComplete="off"
          required
          invalid={Boolean(state.errors?.token)}
        />
      </Field>

      <Field label="Your name" htmlFor="full_name" hint="Shown in the CMS sidebar.">
        <Input id="full_name" name="full_name" autoComplete="name" />
      </Field>

      <Submit disabled={disabled} />
    </form>
  )
}
