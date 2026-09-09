'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { submitContactMessage, type ContactFormState } from '@/lib/actions/contact'
import { Field, Input, Textarea } from '@/components/ui/Form'
import { Alert } from '@/components/ui/Alert'

const INITIAL: ContactFormState = { status: 'idle' }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-13 items-center justify-center rounded-xs border border-forest bg-forest px-7 text-[0.9375rem] font-medium tracking-[0.04em] text-ivory uppercase transition-colors hover:bg-forest-soft disabled:pointer-events-none disabled:opacity-50"
    >
      {pending ? 'Sending…' : 'Send message'}
    </button>
  )
}

/**
 * Contact form.
 *
 * `useActionState` posts to the Server Action, so it works before hydration
 * and degrades to a plain form POST if JavaScript fails. Field errors come
 * back from the same Zod schema the server validates with, so client and
 * server can never disagree about what is valid.
 */
export function ContactForm() {
  const [state, formAction] = useActionState(submitContactMessage, INITIAL)

  if (state.status === 'success') {
    return (
      <Alert tone="success" title="Message sent">
        {state.message}
      </Alert>
    )
  }

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      {state.status === 'error' && state.message ? (
        <Alert tone="danger" title="We could not send that">
          {state.message}
        </Alert>
      ) : null}

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Your name" htmlFor="name" required error={state.errors?.name}>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            required
            defaultValue={state.values?.name}
            invalid={Boolean(state.errors?.name)}
          />
        </Field>

        <Field label="Email" htmlFor="email" required error={state.errors?.email}>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={state.values?.email}
            invalid={Boolean(state.errors?.email)}
          />
        </Field>

        <Field label="Phone" htmlFor="phone" hint="Optional" error={state.errors?.phone}>
          <Input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            defaultValue={state.values?.phone}
            invalid={Boolean(state.errors?.phone)}
          />
        </Field>

        <Field label="Subject" htmlFor="subject" hint="Optional" error={state.errors?.subject}>
          <Input
            id="subject"
            name="subject"
            defaultValue={state.values?.subject}
            invalid={Boolean(state.errors?.subject)}
          />
        </Field>
      </div>

      <Field
        label="Message"
        htmlFor="message"
        required
        hint="Tell us what you need — the more detail, the better we can answer."
        error={state.errors?.message}
      >
        <Textarea
          id="message"
          name="message"
          rows={7}
          required
          minLength={10}
          defaultValue={state.values?.message}
          invalid={Boolean(state.errors?.message)}
        />
      </Field>

      {/*
        Honeypot. Hidden from sight and from assistive technology, and
        excluded from tab order, so only an automated client fills it.
      */}
      <div aria-hidden="true" className="absolute h-0 w-0 overflow-hidden opacity-0">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <SubmitButton />
        <p className="text-[0.8125rem] leading-relaxed text-earth-muted">
          We use your details only to reply. See our{' '}
          <a
            href="/privacy"
            className="underline decoration-earth-muted/40 underline-offset-2 hover:decoration-earth-muted"
          >
            privacy policy
          </a>
          .
        </p>
      </div>
    </form>
  )
}
