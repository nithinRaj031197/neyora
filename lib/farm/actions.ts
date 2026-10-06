'use server'

import { requireAdmin } from '@/lib/auth/session'
import {
  createBatch,
  generateMissingBags,
  recordContamination,
  recordCost,
  recordHarvest,
  recordSale,
  readBagsForPicker,
  setBatchStage,
  FarmError,
  type PickerBag,
} from './repository'
import {
  BATCH_STAGES,
  ID_PATTERNS,
  newBatchSchema,
  newContaminationSchema,
  newCostSchema,
  newHarvestSchema,
  newSaleSchema,
  type BatchStage,
} from './schema'

/**
 * The farm's write actions.
 *
 * Every one checks auth INSIDE the function. A Server Function is reachable by
 * direct POST, so the page that renders the form protects nothing.
 *
 * They return a result rather than throwing, so a rejected write shows as a
 * message next to the form — including the conflict case, where the point is
 * to tell the admin what happened rather than lose their entry.
 */

export type FarmState =
  | { status: 'idle' }
  | { status: 'error'; message: string; fieldErrors?: Record<string, string> }
  | { status: 'saved'; message: string }

async function guard(): Promise<string | null> {
  try {
    await requireAdmin()
    return null
  } catch {
    return 'Your session has expired. Please sign in again.'
  }
}

/** First message per field, so the form can point at the input. */
function fieldErrors(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of issues) {
    const key = issue.path[issue.path.length - 1]
    if (typeof key === 'string' && !out[key]) out[key] = issue.message
  }
  return out
}

function failed(error: unknown, fallback: string): FarmState {
  // A FarmError is a message written for the admin — a conflict, a missing
  // batch. Anything else is internal and must not reach the screen.
  if (error instanceof FarmError) return { status: 'error', message: error.message }
  console.error('[farm] write failed', error)
  return { status: 'error', message: fallback }
}

const value = (formData: FormData, name: string) => {
  const raw = String(formData.get(name) ?? '').trim()
  return raw === '' ? undefined : raw
}

export type BagsState =
  | { status: 'ok'; bags: PickerBag[] }
  | { status: 'error'; message: string }

/**
 * The bags of one batch, fetched when the admin asks for them.
 *
 * ── A READ, BUT STILL A SERVER FUNCTION ───────────────────────────────────
 *
 * Reachable by direct POST exactly like the writes, so it checks the session
 * first and validates the id before it reaches the spreadsheet. Without the
 * auth check this would be an unauthenticated listing of the farm's inventory;
 * without the id check, an arbitrary string would be handed to a sheet read.
 *
 * It returns the two fields the picker renders and a derived flag — not whole
 * bag rows. Substrate weights and timestamps have no business crossing to the
 * browser to draw a list of chips, and keeping the payload minimal is what
 * makes a hundred-bag batch a small response rather than a slow one.
 */
export async function loadBagsAction(batchId: string): Promise<BagsState> {
  const denied = await guard()
  if (denied) return { status: 'error', message: denied }

  if (!ID_PATTERNS.batch.test(batchId)) {
    return { status: 'error', message: 'That is not a batch id.' }
  }

  try {
    return { status: 'ok', bags: await readBagsForPicker(batchId) }
  } catch (error) {
    if (error instanceof FarmError) return { status: 'error', message: error.message }
    // Google being briefly unavailable is the common case here, and the client
    // offers a retry — so this says what to do rather than just what broke.
    console.error('[farm] could not load bags', error)
    return { status: 'error', message: 'Could not reach the spreadsheet. Try again.' }
  }
}

export async function createBatchAction(
  _previous: FarmState,
  formData: FormData,
): Promise<FarmState> {
  const denied = await guard()
  if (denied) return { status: 'error', message: denied }

  const parsed = newBatchSchema.safeParse({
    label: value(formData, 'label'),
    variety: formData.get('variety'),
    bagCount: formData.get('bagCount'),
    preparedDate: formData.get('preparedDate'),
    inoculatedDate: value(formData, 'inoculatedDate'),
    spawnSource: value(formData, 'spawnSource'),
    spawnLot: value(formData, 'spawnLot'),
    spawnUsedGrams: value(formData, 'spawnUsedGrams'),
    substrateType: value(formData, 'substrateType'),
    substratePerBagGrams: value(formData, 'substratePerBagGrams'),
    drySubstratePerBagGrams: value(formData, 'drySubstratePerBagGrams'),
    notes: value(formData, 'notes'),
  })
  if (!parsed.success) {
    return { status: 'error', message: 'Please check the highlighted fields.', fieldErrors: fieldErrors(parsed.error.issues) }
  }

  try {
    const { batchId, bagsWritten } = await createBatch(parsed.data)
    return bagsWritten === parsed.data.bagCount
      ? { status: 'saved', message: `${batchId} created with ${bagsWritten} bags.` }
      : {
          status: 'error',
          // Honest about the partial state, and what to do about it.
          message: `${batchId} was created but only ${bagsWritten} of ${parsed.data.bagCount} bag records were written. Open the batch and regenerate the missing bags.`,
        }
  } catch (error) {
    return failed(error, 'Could not create the batch.')
  }
}

export async function recordHarvestAction(
  _previous: FarmState,
  formData: FormData,
): Promise<FarmState> {
  const denied = await guard()
  if (denied) return { status: 'error', message: denied }

  const parsed = newHarvestSchema.safeParse({
    batchId: formData.get('batchId'),
    date: formData.get('date'),
    flush: formData.get('flush'),
    totalKg: formData.get('totalKg'),
    saleableKg: formData.get('saleableKg') || 0,
    secondaryKg: formData.get('secondaryKg') || 0,
    wasteKg: formData.get('wasteKg') || 0,
    notes: value(formData, 'notes'),
  })
  if (!parsed.success) {
    return { status: 'error', message: 'Please check the highlighted fields.', fieldErrors: fieldErrors(parsed.error.issues) }
  }

  try {
    const id = await recordHarvest(parsed.data)
    return { status: 'saved', message: `${parsed.data.totalKg} kg recorded as ${id}.` }
  } catch (error) {
    return failed(error, 'Could not record the harvest.')
  }
}

export async function recordContaminationAction(
  _previous: FarmState,
  formData: FormData,
): Promise<FarmState> {
  const denied = await guard()
  if (denied) return { status: 'error', message: denied }

  const bagIds = formData.getAll('bagIds').map(String).filter(Boolean)
  const parsed = newContaminationSchema.safeParse({
    batchId: formData.get('batchId'),
    detectedDate: formData.get('detectedDate'),
    bagIds,
    // The two are mutually exclusive by schema: naming bags wins.
    affectedCount: bagIds.length > 0 ? 0 : (formData.get('affectedCount') ?? 0),
    type: formData.get('type'),
    severity: formData.get('severity'),
    action: formData.get('action'),
    estimatedLossKg: value(formData, 'estimatedLossKg'),
    notes: value(formData, 'notes'),
  })
  if (!parsed.success) {
    return { status: 'error', message: 'Please check the highlighted fields.', fieldErrors: fieldErrors(parsed.error.issues) }
  }

  try {
    const id = await recordContamination(parsed.data)
    const affected = parsed.data.bagIds.length || parsed.data.affectedCount
    return { status: 'saved', message: `${affected} bag${affected === 1 ? '' : 's'} recorded as ${id}.` }
  } catch (error) {
    return failed(error, 'Could not record the contamination.')
  }
}

export async function recordCostAction(_previous: FarmState, formData: FormData): Promise<FarmState> {
  const denied = await guard()
  if (denied) return { status: 'error', message: denied }

  const parsed = newCostSchema.safeParse({
    batchId: formData.get('batchId'),
    date: formData.get('date'),
    category: formData.get('category'),
    costType: formData.get('costType') || 'Direct',
    description: value(formData, 'description'),
    quantity: value(formData, 'quantity'),
    unit: value(formData, 'unit'),
    unitCost: value(formData, 'unitCost'),
    totalCost: formData.get('totalCost'),
    notes: value(formData, 'notes'),
  })
  if (!parsed.success) {
    return { status: 'error', message: 'Please check the highlighted fields.', fieldErrors: fieldErrors(parsed.error.issues) }
  }

  try {
    const id = await recordCost(parsed.data)
    return { status: 'saved', message: `Cost recorded as ${id}.` }
  } catch (error) {
    return failed(error, 'Could not record the cost.')
  }
}

export async function recordSaleAction(_previous: FarmState, formData: FormData): Promise<FarmState> {
  const denied = await guard()
  if (denied) return { status: 'error', message: denied }

  /*
   * A sale is allocated across one or more batches. The form posts parallel
   * arrays, so a single-batch sale is just an allocation list of one and the
   * multi-batch case needs no separate code path.
   */
  const batchIds = formData.getAll('allocationBatchId').map(String)
  const quantities = formData.getAll('allocationQuantityKg').map(String)
  const prices = formData.getAll('allocationUnitPrice').map(String)

  const allocations = batchIds
    .map((batchId, i) => ({
      batchId,
      quantityKg: quantities[i] ?? '0',
      unitPrice: prices[i] ?? '0',
    }))
    .filter((a) => a.batchId && Number(a.quantityKg) > 0)

  const parsed = newSaleSchema.safeParse({
    date: formData.get('date'),
    variety: formData.get('variety'),
    channel: formData.get('channel'),
    buyer: value(formData, 'buyer'),
    notes: value(formData, 'notes'),
    allocations,
  })
  if (!parsed.success) {
    return { status: 'error', message: 'Please check the highlighted fields.', fieldErrors: fieldErrors(parsed.error.issues) }
  }

  try {
    const id = await recordSale(parsed.data)
    const total = parsed.data.allocations.reduce((s, a) => s + a.quantityKg, 0)
    return { status: 'saved', message: `${total} kg recorded as ${id}.` }
  } catch (error) {
    return failed(error, 'Could not record the sale.')
  }
}

export async function setBatchStageAction(
  _previous: FarmState,
  formData: FormData,
): Promise<FarmState> {
  const denied = await guard()
  if (denied) return { status: 'error', message: denied }

  const batchId = String(formData.get('batchId') ?? '')
  const to = String(formData.get('to') ?? '') as BatchStage
  if (!BATCH_STAGES.includes(to)) return { status: 'error', message: 'Unknown stage.' }

  try {
    // The value the form loaded. If the sheet changed since, the write is
    // refused rather than overwriting somebody's manual edit.
    await setBatchStage(batchId, to, String(formData.get('expectedUpdatedAt') ?? '') || undefined)
    return { status: 'saved', message: `${batchId} is now ${to.toLowerCase()}.` }
  } catch (error) {
    return failed(error, 'Could not change the stage.')
  }
}

export async function generateBagsAction(_previous: FarmState, formData: FormData): Promise<FarmState> {
  const denied = await guard()
  if (denied) return { status: 'error', message: denied }

  try {
    const created = await generateMissingBags(String(formData.get('batchId') ?? ''))
    return {
      status: 'saved',
      message: created === 0 ? 'Every bag record already exists.' : `${created} bag records created.`,
    }
  } catch (error) {
    return failed(error, 'Could not generate the bag records.')
  }
}
