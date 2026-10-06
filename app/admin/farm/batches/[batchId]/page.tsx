import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getCurrentAdmin } from '@/lib/auth/session'
import { farmReady } from '@/lib/farm/config'
import { readBagsFor, readFarm } from '@/lib/farm/repository'
import { analyseBatch } from '@/lib/farm/analytics'
import { ChangeStage, GenerateBags } from '@/components/admin/farm/QuickActions'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { formatPrice } from '@/lib/utils/format'

export const dynamic = 'force-dynamic'

/**
 * One batch, in full.
 *
 * The most important screen in the module: everything needed to judge a batch
 * on one page — what it is, how its bags fared, what it produced, what it cost
 * and earned, and every event in order. Analytics come from the shared layer,
 * so no number here can disagree with the dashboard.
 */
export default async function BatchDetailPage({
  params,
}: {
  params: Promise<{ batchId: string }>
}) {
  if (!(await getCurrentAdmin())) redirect('/admin/login')
  if (!farmReady()) redirect('/admin/farm')

  const { batchId } = await params
  const data = await readFarm()
  const batch = data.batches.find((b) => b.batchId === decodeURIComponent(batchId))
  if (!batch) notFound()

  const a = analyseBatch(batch, data)
  const bags = await readBagsFor(batch.batchId).catch(() => [])
  const missingBags = Math.max(batch.bagCount - bags.length, 0)

  const harvests = data.harvests.filter((h) => h.batchId === batch.batchId).sort((x, y) => (x.flush ?? 0) - (y.flush ?? 0))
  const events = data.contamination.filter((c) => c.batchId === batch.batchId)
  const costs = data.costs.filter((c) => c.batchId === batch.batchId)
  const sales = data.sales.filter((s) => s.batchId === batch.batchId)

  const money = (n?: number) => (n === undefined ? '—' : (formatPrice(n, 'INR') ?? '—'))
  const kg = (n?: number) => (n === undefined ? '—' : `${n} kg`)

  return (
    <>
      <Link href="/admin/farm/batches" className="press inline-flex items-center gap-1.5 text-[0.875rem] text-earth-muted hover:text-forest">
        <Icon name="chevron-right" size={15} className="rotate-180" />
        All batches
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-mono text-[1.5rem] text-forest">{batch.batchId}</h1>
          <p className="mt-1 text-[0.875rem] text-earth-muted">
            {batch.variety}
            {batch.label ? ` · ${batch.label}` : ''}
            {batch.preparedDate ? ` · prepared ${batch.preparedDate}` : ''}
          </p>
        </div>
        <Badge tone="leaf">{batch.stage}</Badge>
      </div>

      <div className="mt-4">
        <ChangeStage batch={{ batchId: batch.batchId, label: batch.label ?? batch.batchId, variety: batch.variety, stage: batch.stage, updatedAt: batch.updatedAt }} />
      </div>
      <GenerateBags batchId={batch.batchId} missing={missingBags} />

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.3fr_1fr] lg:items-start">
        <div className="grid gap-5">
          <Section title="Bags">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Prepared" value={String(a.health.prepared)} />
              <Stat label="Growing" value={String(a.health.remaining)} />
              <Stat label="Affected" value={String(a.health.affected)} />
              <Stat label="Discarded" value={String(a.health.discarded)} />
            </dl>
            {a.health.anonymousAffected > 0 ? (
              <p className="mt-3 text-[0.75rem] leading-relaxed text-earth-muted">
                {a.health.identifiedAffected} bag{a.health.identifiedAffected === 1 ? '' : 's'} named
                individually, {a.health.anonymousAffected} reported only as a count.
              </p>
            ) : null}
          </Section>

          <Section title="Production">
            {harvests.length === 0 ? (
              <p className="text-[0.875rem] text-earth-muted">Nothing harvested yet.</p>
            ) : (
              <>
                <ul className="grid gap-2">
                  {harvests.map((h) => (
                    <li key={h.harvestId} className="flex flex-wrap items-baseline justify-between gap-2 text-[0.875rem]">
                      <span className="text-earth">
                        Flush {h.flush ?? '?'} <span className="text-earth-muted">· {h.date ?? 'undated'}</span>
                      </span>
                      <span className="text-earth-soft">
                        {h.totalKg} kg <span className="text-earth-muted">({h.saleableKg} saleable)</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-beige pt-3 sm:grid-cols-4">
                  <Stat label="Total" value={kg(a.production.totalKg)} />
                  <Stat label="Saleable" value={kg(a.production.saleableKg)} />
                  <Stat label="Grade B" value={kg(a.production.secondaryKg)} />
                  <Stat label="Waste" value={kg(a.production.wasteKg)} />
                </dl>
              </>
            )}
          </Section>

          <Section title="Yield">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Per bag prepared" value={a.yields.perBagPrepared === undefined ? '—' : `${a.yields.perBagPrepared} kg`} />
              <Stat label="Per bag growing" value={a.yields.perBagRemaining === undefined ? '—' : `${a.yields.perBagRemaining} kg`} />
              <Stat label="Days to first harvest" value={a.daysToFirstHarvest === undefined ? '—' : String(a.daysToFirstHarvest)} />
              {/* BE needs dry substrate weight; from wet it reads far too low. */}
              <Stat
                label="Biological efficiency"
                value={a.yields.biologicalEfficiency === undefined ? 'Not enough data' : `${a.yields.biologicalEfficiency}%`}
              />
            </dl>
          </Section>
        </div>

        <div className="grid gap-5">
          <Section title="Economics">
            <dl className="grid gap-2.5 text-[0.9375rem]">
              <Line label="Direct cost" value={money(a.economics.directCost)} />
              <Line label="Allocated cost" value={money(a.economics.allocatedCost)} />
              <Line label="Total cost" value={money(a.economics.totalCost)} strong />
              <Line label="Revenue" value={money(a.economics.revenue)} strong />
              <Line
                label="Profit"
                value={money(a.economics.profit)}
                strong
                tone={a.economics.profit < 0 ? 'danger' : 'good'}
              />
              <Line label="Margin" value={a.economics.marginPercent === undefined ? '—' : `${a.economics.marginPercent}%`} />
              <Line label="Cost / kg harvested" value={money(a.economics.costPerKgHarvested)} />
              <Line label="Cost / kg saleable" value={money(a.economics.costPerKgSaleable)} />
              <Line label="Cost / bag" value={money(a.economics.costPerBag)} />
            </dl>
          </Section>

          <Section title="Contamination events">
            {events.length === 0 ? (
              <p className="text-[0.875rem] text-earth-muted">None recorded.</p>
            ) : (
              <ul className="grid gap-2.5 text-[0.875rem]">
                {events.map((e) => (
                  <li key={e.contaminationId}>
                    <span className="text-earth">{e.type ?? 'Unknown'}</span>{' '}
                    <span className="text-earth-muted">· {e.detectedDate ?? 'undated'} · {e.severity ?? '—'} · {e.action ?? '—'}</span>
                    <p className="text-[0.8125rem] text-earth-muted">
                      {e.bagIds.length > 0
                        ? `${e.bagIds.length} bag${e.bagIds.length === 1 ? '' : 's'}: ${e.bagIds.map((b) => b.slice(-4)).join(', ')}`
                        : `${e.affectedCount} bags (not individually identified)`}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Costs and sales">
            {costs.length === 0 && sales.length === 0 ? (
              <p className="text-[0.875rem] text-earth-muted">Nothing recorded.</p>
            ) : (
              <ul className="grid gap-2 text-[0.875rem]">
                {costs.map((c) => (
                  <li key={c.costId} className="flex justify-between gap-3">
                    <span className="text-earth-soft">
                      {c.category ?? 'Cost'} <span className="text-earth-muted">· {c.date ?? ''}</span>
                    </span>
                    <span className="text-danger">−{money(c.totalCost)}</span>
                  </li>
                ))}
                {sales.map((s) => (
                  <li key={s.allocationId} className="flex justify-between gap-3">
                    <span className="text-earth-soft">
                      {s.quantityKg} kg <span className="text-earth-muted">· {s.channel ?? ''} · {s.date ?? ''}</span>
                    </span>
                    <span className="text-botanical">+{money(s.revenue)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-sm border border-beige bg-ivory p-5">
      <h2 className="text-[0.75rem] font-medium tracking-[0.1em] text-earth-muted uppercase">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.75rem] text-earth-muted">{label}</dt>
      <dd className="mt-0.5 text-[1rem] text-earth">{value}</dd>
    </div>
  )
}

function Line({
  label,
  value,
  strong,
  tone,
}: {
  label: string
  value: string
  strong?: boolean
  tone?: 'danger' | 'good'
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-earth-muted">{label}</dt>
      <dd
        className={
          tone === 'danger' ? 'font-medium text-danger' : tone === 'good' ? 'font-medium text-botanical' : strong ? 'font-medium text-forest' : 'text-earth-soft'
        }
      >
        {value}
      </dd>
    </div>
  )
}
