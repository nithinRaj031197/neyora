'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from './Modal'
import { Alert } from '@/components/ui/Alert'
import { useToast } from './Toast'
import { purgeDemoContent } from '@/lib/actions/site'

/**
 * Removes every row flagged `is_demo`.
 *
 * Behind a confirmation because it is a hard delete and cannot be undone. The
 * underlying `purge_demo_content()` function re-checks the caller's role in
 * the database, so this button is a convenience rather than the gate.
 *
 * Seeded *pages* are deliberately kept: /about, /farm and the legal pages are
 * real routes, and deleting their rows would 404 them. Rewrite those instead.
 */
export function PurgeDemoButton() {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<string | null>(null)
  const router = useRouter()
  const { push } = useToast()

  function run() {
    startTransition(async () => {
      const state = await purgeDemoContent()
      setOpen(false)
      if (state.status === 'success') {
        setResult(state.message ?? 'Demo content removed.')
        push('success', 'Demo content removed')
        router.refresh()
      } else {
        push('error', state.message ?? 'Could not purge demo content')
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {result ? <Alert tone="success">{result}</Alert> : null}

      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={pending}
        className="inline-flex h-11 w-fit items-center rounded-xs border border-danger px-4 text-[0.8125rem] font-medium tracking-[0.04em] text-danger uppercase transition-colors hover:bg-danger/8 disabled:pointer-events-none disabled:opacity-50"
      >
        {pending ? 'Removing…' : 'Remove all demo content'}
      </button>

      <p className="max-w-[70ch] text-[0.75rem] leading-relaxed text-earth-muted">
        Deletes the seeded recipes, product, categories, FAQs, testimonials and placeholder images.
        Seeded <strong>pages</strong> are kept, because /about, /farm and the legal pages are real
        routes — rewrite their copy instead of deleting them.
      </p>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Remove all demo content?"
        description="This is a permanent delete, not a soft delete. Make sure your own content is in place first."
        footer={
          <>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-10 items-center rounded-xs border border-beige px-4 text-[0.8125rem] font-medium tracking-[0.04em] text-earth-soft uppercase transition-colors hover:border-forest/50 hover:text-forest"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={run}
              disabled={pending}
              className="inline-flex h-10 items-center rounded-xs border border-danger bg-danger px-4 text-[0.8125rem] font-medium tracking-[0.04em] text-ivory uppercase transition-colors hover:bg-danger/90 disabled:pointer-events-none disabled:opacity-50"
            >
              {pending ? 'Removing…' : 'Remove permanently'}
            </button>
          </>
        }
      >
        <p className="text-[0.875rem] leading-relaxed text-earth-soft">
          Everything flagged as demo content will be deleted from the database and cannot be
          recovered. Anything you have written yourself is untouched.
        </p>
      </Modal>
    </div>
  )
}
