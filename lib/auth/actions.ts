'use server'

import { redirect } from 'next/navigation'
import { authenticate } from './admins'
import { createSession, destroySession } from './session'

export type LoginState = { status: 'idle' } | { status: 'error'; message: string }

/**
 * Sign in.
 *
 * The error message never says whether the email exists — see `authenticate`.
 * `redirect()` throws by design in Next, so it must sit outside the try block
 * or it would be caught and reported as a failed login.
 */
export async function signIn(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    return { status: 'error', message: 'Enter your email and password.' }
  }

  let ok = false
  try {
    const result = await authenticate(email, password)
    if (!result.ok) {
      return {
        status: 'error',
        message:
          result.reason === 'locked'
            ? 'Too many attempts. Try again in 15 minutes.'
            : 'Those details are not right.',
      }
    }
    await createSession(result.admin.email)
    ok = true
  } catch (error) {
    console.error('[auth] sign-in failed', error)
    return { status: 'error', message: 'Could not sign in. Please try again.' }
  }

  if (ok) redirect('/admin')
  return { status: 'idle' }
}

export async function signOut(): Promise<void> {
  await destroySession()
  redirect('/admin/login')
}
