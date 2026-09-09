'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/utils/cn'

type ToastTone = 'success' | 'error' | 'info'

interface Toast {
  id: number
  tone: ToastTone
  message: string
}

interface ToastApi {
  push: (tone: ToastTone, message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

/**
 * Toast notifications for the admin.
 *
 * The container is a polite live region, so a screen reader hears "Recipe
 * published" without focus moving — which matters because the editor's cursor
 * is usually still in a field.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const push = useCallback((tone: ToastTone, message: string) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, tone, message }])
  }, [])

  const api = useMemo(() => ({ push }), [push])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-100 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end"
      >
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDismiss={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  // Errors stay until dismissed; confirmations clear themselves.
  useEffect(() => {
    if (toast.tone === 'error') return
    const timer = window.setTimeout(onDismiss, 4500)
    return () => window.clearTimeout(timer)
  }, [toast.tone, onDismiss])

  const tones: Record<ToastTone, string> = {
    success: 'border-success/45 bg-forest text-ivory',
    error: 'border-danger bg-danger text-ivory',
    info: 'border-earth-soft bg-earth text-ivory',
  }

  return (
    <div
      className={cn(
        'animate-rise pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-sm border px-4 py-3 shadow-none',
        tones[toast.tone],
      )}
    >
      <Icon name={toast.tone === 'success' ? 'check' : 'alert'} size={17} className="mt-0.5" />
      <p className="flex-1 text-[0.875rem] leading-snug">{toast.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="-mt-0.5 -mr-1 grid h-7 w-7 place-items-center rounded-xs opacity-70 transition-opacity hover:opacity-100"
      >
        <Icon name="plus" size={14} className="rotate-45" />
      </button>
    </div>
  )
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext)
  // A no-op fallback keeps a component usable outside the provider (in tests,
  // for example) instead of throwing at render time.
  return context ?? { push: () => {} }
}

/**
 * Bridges a Server Action's ActionState to a toast.
 *
 * Keyed on `nonce` rather than `status`, so submitting the same form twice
 * with the same outcome still announces the second result.
 */
export function useActionToast(state: {
  status: 'idle' | 'success' | 'error'
  message?: string
  nonce?: number
}) {
  const { push } = useToast()

  useEffect(() => {
    if (state.status === 'idle' || !state.message) return
    push(state.status === 'success' ? 'success' : 'error', state.message)
  }, [state.status, state.message, state.nonce, push])
}
