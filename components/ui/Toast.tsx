'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import * as RadixToast from '@radix-ui/react-toast'
import { Icon } from './Icon'
import { cn } from '@/lib/utils/cn'

/**
 * Toasts.
 *
 * Built on Radix's Toast primitive rather than hand-rolled, because the parts
 * that are easy to get wrong are the parts you cannot see: it announces to
 * screen readers through a live region, pauses its timer on hover and on
 * window blur, restarts cleanly, and supports swipe-to-dismiss. A div that
 * fades out after three seconds does none of that.
 *
 * Deliberately one at a time in practice — the admin saves one thing at a
 * time, and a stack of toasts is a design that has stopped trusting itself.
 */

type Tone = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  tone: Tone
  title: string
  description?: string
}

const ToastContext = createContext<{
  toast: (t: Omit<ToastItem, 'id'>) => void
} | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}

const TONE: Record<Tone, { ring: string; icon: 'check' | 'alert'; iconClass: string }> = {
  success: { ring: 'border-botanical/45', icon: 'check', iconClass: 'text-botanical' },
  error: { ring: 'border-danger/45', icon: 'alert', iconClass: 'text-danger' },
  info: { ring: 'border-beige', icon: 'alert', iconClass: 'text-earth-muted' },
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const toast = useCallback((t: Omit<ToastItem, 'id'>) => {
    setItems((current) => [...current, { ...t, id: Date.now() + Math.random() }])
  }, [])

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      <RadixToast.Provider swipeDirection="right" duration={4500}>
        {children}

        {items.map((item) => {
          const tone = TONE[item.tone]
          return (
            <RadixToast.Root
              key={item.id}
              onOpenChange={(open) => {
                if (!open) setItems((c) => c.filter((i) => i.id !== item.id))
              }}
              className={cn(
                'toast-root flex items-start gap-3 rounded-sm border bg-ivory p-4',
                'shadow-[0_8px_30px_-12px_rgb(20_18_15_/_0.28)]',
                tone.ring,
              )}
            >
              <Icon name={tone.icon} size={18} className={cn('mt-0.5 shrink-0', tone.iconClass)} />
              <div className="min-w-0 flex-1">
                <RadixToast.Title className="text-[0.9375rem] font-medium text-forest">
                  {item.title}
                </RadixToast.Title>
                {item.description ? (
                  <RadixToast.Description className="mt-1 text-[0.875rem] leading-relaxed text-earth-soft">
                    {item.description}
                  </RadixToast.Description>
                ) : null}
              </div>
              <RadixToast.Close
                aria-label="Dismiss"
                className="press -m-1 shrink-0 rounded-xs p-1 text-earth-muted hover:text-forest"
              >
                <Icon name="close" size={16} />
              </RadixToast.Close>
            </RadixToast.Root>
          )
        })}

        {/*
          Bottom-right on desktop, but full-width along the bottom on a phone,
          where a floating card in the corner is easy to miss and awkward to
          reach.

          The bottom padding is a utility rather than a rule on
          `.toast-viewport`, because `p-4` sits in Tailwind's utilities layer
          and would otherwise win over anything the components layer says. On a
          phone it clears the admin's fixed bottom nav — a toast landing on top
          of the nav blocks the only way out of the page it is reporting on —
          and the home bar below it.
        */}
        <RadixToast.Viewport
          className={cn(
            'toast-viewport fixed right-0 bottom-0 z-[100] flex w-full max-w-[26rem] flex-col gap-2 p-4 outline-none',
            'pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:pb-[calc(1rem+env(safe-area-inset-bottom))]',
          )}
        />
      </RadixToast.Provider>
    </ToastContext.Provider>
  )
}
