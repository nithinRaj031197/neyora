/**
 * Shared shape for every Server Action result.
 *
 * One type across the whole admin means every form can render errors, success
 * and pending states the same way — and `errors` is keyed by field name so a
 * message lands next to the input that caused it.
 *
 * No 'server-only' marker: client components import the type.
 */
export interface ActionState<T = undefined> {
  status: 'idle' | 'success' | 'error'
  message?: string
  errors?: Record<string, string>
  data?: T
  /** Bumped on every result so a client effect can react to repeat submits. */
  nonce?: number
}

export const IDLE: ActionState = { status: 'idle' }

export function ok<T>(message: string, data?: T): ActionState<T> {
  return { status: 'success', message, data, nonce: Date.now() }
}

export function fail(message: string, errors?: Record<string, string>): ActionState<never> {
  return { status: 'error', message, errors, nonce: Date.now() }
}
