'use client'

import { useActionState, useId, useState } from 'react'
import {
  createBatchAction,
  generateBagsAction,
  recordContaminationAction,
  recordCostAction,
  recordHarvestAction,
  recordSaleAction,
  setBatchStageAction,
  type FarmState,
} from '@/lib/farm/actions'
import {
  CONTAMINATION_ACTIONS,
  CONTAMINATION_SEVERITIES,
  CONTAMINATION_TYPES,
  COST_CATEGORIES,
  COST_TYPES,
  KNOWN_VARIETIES,
  SALES_CHANNELS,
  STAGE_TRANSITIONS,
  type BatchStage,
} from '@/lib/farm/schema'
import { BagPicker } from './BagPicker'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { useActionToast } from '../useActionToast'
import { cn } from '@/lib/utils/cn'

/**
 * Daily farm entry.
 *
 * Designed for a phone held in one hand in a growing room, not for a desk.
 * Each action is a single disclosure: tap, fill four or five fields, save.
 * Nothing requires navigating to another screen first, because the thing being
 * recorded — 2.4 kg from flush two — takes ten seconds and should not cost a
 * page load.
 *
 * The forms post to Server Functions that re-validate everything, so none of
 * the client-side convenience here is load-bearing.
 */

export interface BatchOption {
  batchId: string
  label: string
  variety: string
  stage: BatchStage
  updatedAt?: string
}

const today = () => new Date().toISOString().slice(0, 10)

const field =
  'h-12 w-full rounded-xs border border-beige bg-ivory px-3.5 text-[1rem] text-earth ' +
  'focus-visible:border-leaf focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-leaf'

function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[0.8125rem] text-earth-soft">
      {children}
    </label>
  )
}

function Panel({
  icon,
  title,
  children,
}: {
  icon: 'plus' | 'alert' | 'leaf' | 'check'
  title: string
  children: (close: () => void) => React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-sm border border-beige bg-ivory">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="press flex w-full items-center gap-2.5 px-4 py-3.5 text-left text-[0.9375rem] font-medium text-forest"
      >
        <Icon name={icon} size={17} className="shrink-0 text-botanical" />
        {title}
        <Icon
          name="chevron-down"
          size={16}
          className={cn('ml-auto shrink-0 text-earth-muted transition-transform', open && 'rotate-180')}
        />
      </button>
      {open ? <div className="border-t border-beige p-4">{children(() => setOpen(false))}</div> : null}
    </div>
  )
}

function useFarmForm(action: (s: FarmState, f: FormData) => Promise<FarmState>, title: string) {
  const [state, dispatch, pending] = useActionState<FarmState, FormData>(action, { status: 'idle' })
  useActionToast(state, { title, description: state.status === 'saved' ? state.message : undefined })
  return { state, dispatch, pending }
}

function Errors({ state }: { state: FarmState }) {
  if (state.status !== 'error') return null
  return (
    <p role="alert" className="mt-3 rounded-xs bg-danger/10 px-3 py-2.5 text-[0.8125rem] text-danger">
      {state.message}
    </p>
  )
}

// ---------------------------------------------------------------------------

export function RecordHarvest({ batches }: { batches: BatchOption[] }) {
  const id = useId()
  const { state, dispatch, pending } = useFarmForm(recordHarvestAction, 'Harvest recorded')

  return (
    <Panel icon="plus" title="Record harvest">
      {() => (
        <form action={dispatch} className="grid gap-3">
          <div>
            <Label htmlFor={`${id}-batch`}>Batch</Label>
            <select id={`${id}-batch`} name="batchId" required className={field}>
              {batches.map((b) => (
                <option key={b.batchId} value={b.batchId}>
                  {b.batchId} · {b.variety}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`${id}-date`}>Date</Label>
              <input id={`${id}-date`} name="date" type="date" required defaultValue={today()} className={field} />
            </div>
            <div>
              <Label htmlFor={`${id}-flush`}>Flush</Label>
              <input id={`${id}-flush`} name="flush" type="number" min={1} max={10} defaultValue={1} required inputMode="numeric" className={field} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`${id}-total`}>Total kg</Label>
              <input id={`${id}-total`} name="totalKg" type="number" step="0.01" min={0} required inputMode="decimal" className={field} />
            </div>
            <div>
              <Label htmlFor={`${id}-saleable`}>Saleable kg</Label>
              <input id={`${id}-saleable`} name="saleableKg" type="number" step="0.01" min={0} inputMode="decimal" className={field} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`${id}-secondary`}>Grade B kg</Label>
              <input id={`${id}-secondary`} name="secondaryKg" type="number" step="0.01" min={0} inputMode="decimal" className={field} />
            </div>
            <div>
              <Label htmlFor={`${id}-waste`}>Waste kg</Label>
              <input id={`${id}-waste`} name="wasteKg" type="number" step="0.01" min={0} inputMode="decimal" className={field} />
            </div>
          </div>
          <Errors state={state} />
          <Button type="submit" disabled={pending} fullWidth>
            {pending ? 'Saving…' : 'Record harvest'}
          </Button>
        </form>
      )}
    </Panel>
  )
}

export function ReportContamination({ batches }: { batches: BatchOption[] }) {
  const id = useId()
  const { state, dispatch, pending } = useFarmForm(recordContaminationAction, 'Contamination recorded')
  const [batchId, setBatchId] = useState(batches[0]?.batchId ?? '')
  const [mode, setMode] = useState<'bags' | 'count'>('count')
  const [selectedBags, setSelectedBags] = useState<string[]>([])

  return (
    <Panel icon="alert" title="Report contamination">
      {() => (
        <form action={dispatch} className="grid gap-3">
          <div>
            <Label htmlFor={`${id}-batch`}>Batch</Label>
            <select
              id={`${id}-batch`}
              name="batchId"
              required
              value={batchId}
              onChange={(e) => {
                setBatchId(e.target.value)
                // A bag id belongs to one batch only; carrying the selection
                // across would post another batch's bags.
                setSelectedBags([])
              }}
              className={field}
            >
              {batches.map((b) => (
                <option key={b.batchId} value={b.batchId}>
                  {b.batchId} · {b.variety}
                </option>
              ))}
            </select>
          </div>

          {/*
            Either specific bags or a count — never both. Recording three named
            bags AND a count of three would be counted twice by any denominator
            that trusted both, so the form makes it a choice.
          */}
          <fieldset>
            <legend className="mb-1.5 text-[0.8125rem] text-earth-soft">Affected bags</legend>
            <div className="flex gap-2">
              {(['count', 'bags'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m)
                    // Leaving the selection behind would post bag ids along
                    // with a count, which the server refuses outright.
                    if (m === 'count') setSelectedBags([])
                  }}
                  aria-pressed={mode === m}
                  className={cn(
                    'press h-11 flex-1 rounded-xs border text-[0.8125rem]',
                    mode === m
                      ? 'border-forest bg-forest text-ivory'
                      : 'border-beige text-earth-soft',
                  )}
                >
                  {m === 'count' ? 'Record count only' : 'Select specific bags'}
                </button>
              ))}
            </div>
          </fieldset>

          {mode === 'count' ? (
            <div>
              <Label htmlFor={`${id}-count`}>How many bags</Label>
              <input id={`${id}-count`} name="affectedCount" type="number" min={1} required inputMode="numeric" className={field} />
            </div>
          ) : (
            <BagPicker key={batchId} batchId={batchId} selected={selectedBags} onChange={setSelectedBags} />
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`${id}-date`}>Detected</Label>
              <input id={`${id}-date`} name="detectedDate" type="date" required defaultValue={today()} className={field} />
            </div>
            <div>
              <Label htmlFor={`${id}-type`}>Type</Label>
              <select id={`${id}-type`} name="type" required className={field}>
                {CONTAMINATION_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`${id}-severity`}>Severity</Label>
              <select id={`${id}-severity`} name="severity" required className={field}>
                {CONTAMINATION_SEVERITIES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor={`${id}-action`}>Action</Label>
              <select id={`${id}-action`} name="action" required defaultValue="Discarded" className={field}>
                {CONTAMINATION_ACTIONS.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>
          <Errors state={state} />
          <Button type="submit" disabled={pending || (mode === 'bags' && selectedBags.length === 0)} fullWidth>
            {pending ? 'Saving…' : 'Report contamination'}
          </Button>
        </form>
      )}
    </Panel>
  )
}

export function AddCost({ batches }: { batches: BatchOption[] }) {
  const id = useId()
  const { state, dispatch, pending } = useFarmForm(recordCostAction, 'Cost recorded')

  return (
    <Panel icon="plus" title="Add cost">
      {() => (
        <form action={dispatch} className="grid gap-3">
          <div>
            <Label htmlFor={`${id}-batch`}>Batch</Label>
            <select id={`${id}-batch`} name="batchId" required className={field}>
              {batches.map((b) => (
                <option key={b.batchId} value={b.batchId}>
                  {b.batchId} · {b.variety}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`${id}-category`}>Category</Label>
              <select id={`${id}-category`} name="category" required className={field}>
                {COST_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor={`${id}-type`}>Type</Label>
              <select id={`${id}-type`} name="costType" defaultValue="Direct" className={field}>
                {COST_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`${id}-date`}>Date</Label>
              <input id={`${id}-date`} name="date" type="date" required defaultValue={today()} className={field} />
            </div>
            <div>
              <Label htmlFor={`${id}-total`}>Amount ₹</Label>
              <input id={`${id}-total`} name="totalCost" type="number" step="0.01" min={0} required inputMode="decimal" className={field} />
            </div>
          </div>
          <div>
            <Label htmlFor={`${id}-description`}>Description</Label>
            <input id={`${id}-description`} name="description" className={field} />
          </div>
          <Errors state={state} />
          <Button type="submit" disabled={pending} fullWidth>
            {pending ? 'Saving…' : 'Add cost'}
          </Button>
        </form>
      )}
    </Panel>
  )
}

export function RecordSale({ batches }: { batches: BatchOption[] }) {
  const id = useId()
  const { state, dispatch, pending } = useFarmForm(recordSaleAction, 'Sale recorded')
  /*
   * A sale can be picked from more than one batch. Rows are added on demand,
   * so the common single-batch case stays one line and the split case needs no
   * different screen.
   */
  const [rows, setRows] = useState(1)

  return (
    <Panel icon="check" title="Record sale">
      {() => (
        <form action={dispatch} className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`${id}-date`}>Date</Label>
              <input id={`${id}-date`} name="date" type="date" required defaultValue={today()} className={field} />
            </div>
            <div>
              <Label htmlFor={`${id}-variety`}>Variety</Label>
              <select id={`${id}-variety`} name="variety" required className={field}>
                {KNOWN_VARIETIES.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <Label htmlFor={`${id}-channel`}>Channel</Label>
            <select id={`${id}-channel`} name="channel" required className={field}>
              {SALES_CHANNELS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>

          <p className="mt-1 text-[0.75rem] tracking-[0.08em] text-earth-muted uppercase">
            From which batches
          </p>
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto_auto] gap-2">
              <select name="allocationBatchId" required className={field} aria-label={`Batch ${i + 1}`}>
                {batches.map((b) => (
                  <option key={b.batchId} value={b.batchId}>
                    {b.batchId}
                  </option>
                ))}
              </select>
              <input name="allocationQuantityKg" type="number" step="0.01" min={0} placeholder="kg" required inputMode="decimal" aria-label={`Quantity ${i + 1}`} className={cn(field, 'w-20')} />
              <input name="allocationUnitPrice" type="number" step="0.01" min={0} placeholder="₹/kg" required inputMode="decimal" aria-label={`Price ${i + 1}`} className={cn(field, 'w-24')} />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setRows((r) => Math.min(r + 1, 6))}
            className="press h-10 rounded-xs border border-beige text-[0.8125rem] text-earth-soft"
          >
            + Split across another batch
          </button>

          <Errors state={state} />
          <Button type="submit" disabled={pending} fullWidth>
            {pending ? 'Saving…' : 'Record sale'}
          </Button>
        </form>
      )}
    </Panel>
  )
}

export function ChangeStage({ batch }: { batch: BatchOption }) {
  const { state, dispatch, pending } = useFarmForm(setBatchStageAction, 'Stage updated')
  const next = STAGE_TRANSITIONS[batch.stage] ?? []
  if (next.length === 0) return null

  return (
    <form action={dispatch} className="flex flex-wrap gap-2">
      <input type="hidden" name="batchId" value={batch.batchId} />
      {/* What the page loaded. The write is refused if the sheet changed. */}
      <input type="hidden" name="expectedUpdatedAt" value={batch.updatedAt ?? ''} />
      {next.map((stage) => (
        <Button key={stage} type="submit" name="to" value={stage} size="sm" variant={stage === 'Discarded' ? 'ghost' : 'secondary'} disabled={pending}
          className={stage === 'Discarded' ? 'text-danger hover:bg-danger/8 hover:text-danger' : undefined}>
          {stage === 'Discarded' ? 'Discard batch' : `Move to ${stage.toLowerCase()}`}
        </Button>
      ))}
      {state.status === 'error' ? (
        <p role="alert" className="w-full rounded-xs bg-danger/10 px-3 py-2 text-[0.8125rem] text-danger">
          {state.message}
        </p>
      ) : null}
    </form>
  )
}

export function GenerateBags({ batchId, missing }: { batchId: string; missing: number }) {
  const { state, dispatch, pending } = useFarmForm(generateBagsAction, 'Bag records created')
  if (missing <= 0) return null

  return (
    <form action={dispatch} className="mt-3 rounded-xs border border-golden/40 bg-golden/10 px-3 py-2.5">
      <input type="hidden" name="batchId" value={batchId} />
      <p className="text-[0.8125rem] text-earth-soft">
        {missing} bag record{missing === 1 ? '' : 's'} missing — the batch was created but some bag
        rows did not save.
      </p>
      <Button type="submit" size="sm" variant="secondary" disabled={pending} className="mt-2">
        {pending ? 'Generating…' : 'Generate missing bags'}
      </Button>
      {state.status === 'error' ? (
        <p role="alert" className="mt-2 text-[0.8125rem] text-danger">{state.message}</p>
      ) : null}
    </form>
  )
}

export function CreateBatch() {
  const id = useId()
  const { state, dispatch, pending } = useFarmForm(createBatchAction, 'Batch created')

  return (
    <Panel icon="leaf" title="New batch">
      {() => (
        <form action={dispatch} className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`${id}-variety`}>Variety</Label>
              <input id={`${id}-variety`} name="variety" list={`${id}-varieties`} required defaultValue={KNOWN_VARIETIES[0]} className={field} />
              <datalist id={`${id}-varieties`}>
                {KNOWN_VARIETIES.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </div>
            <div>
              <Label htmlFor={`${id}-bags`}>Bags</Label>
              <input id={`${id}-bags`} name="bagCount" type="number" min={1} max={2000} required inputMode="numeric" className={field} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`${id}-prepared`}>Prepared</Label>
              <input id={`${id}-prepared`} name="preparedDate" type="date" required defaultValue={today()} className={field} />
            </div>
            <div>
              <Label htmlFor={`${id}-lot`}>Spawn lot</Label>
              <input id={`${id}-lot`} name="spawnLot" className={field} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`${id}-substrate`}>Substrate / bag (g)</Label>
              <input id={`${id}-substrate`} name="substratePerBagGrams" type="number" min={0} inputMode="numeric" className={field} />
            </div>
            <div>
              <Label htmlFor={`${id}-dry`}>Dry substrate / bag (g)</Label>
              <input id={`${id}-dry`} name="drySubstratePerBagGrams" type="number" min={0} inputMode="numeric" className={field} />
            </div>
          </div>
          {/* Why we ask for dry weight separately, where it is being asked. */}
          <p className="-mt-1 text-[0.75rem] leading-relaxed text-earth-muted">
            Dry weight is only needed for biological efficiency. Leave it blank and that one metric
            says “not enough data” rather than showing a wrong number.
          </p>
          <Errors state={state} />
          <Button type="submit" disabled={pending} fullWidth>
            {pending ? 'Creating…' : 'Create batch and bags'}
          </Button>
        </form>
      )}
    </Panel>
  )
}
