'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/session'
import { advanceOrder } from './repository'
import { ORDER_STATUSES, type OrderStatus } from './schema'

/**
 * Move an order to its next status.
 *
 * The auth check is INSIDE the function, not only on the page that renders the
 * button. The Next docs are explicit that Server Functions are reachable by
 * direct POST — hiding the button protects nobody.
 */
export async function setOrderStatus(formData: FormData): Promise<void> {
  await requireAdmin()

  const reference = String(formData.get('reference') ?? '')
  const from = String(formData.get('from') ?? '')
  const to = String(formData.get('to') ?? '')

  if (!ORDER_STATUSES.includes(from as OrderStatus) || !ORDER_STATUSES.includes(to as OrderStatus)) {
    throw new Error('Unknown status')
  }
  // advanceOrder re-checks the transition and matches on the current status,
  // so a stale page cannot apply a move twice.
  await advanceOrder(reference, from as OrderStatus, to as OrderStatus)
  revalidatePath('/admin')
}
