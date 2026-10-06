import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentAdmin } from '@/lib/auth/session'
import { farmReady } from '@/lib/farm/config'
import { readFarm } from '@/lib/farm/repository'
import { analyseBatch } from '@/lib/farm/analytics'
import { CreateBatch } from '@/components/admin/farm/QuickActions'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { formatPrice } from '@/lib/utils/format'

export const dynamic = 'force-dynamic'

const TONE = {
  Preparing: 'outline', Incubating: 'golden', Fruiting: 'leaf',
  Harvesting: 'leaf', Completed: 'success', Discarded: 'danger',
} as const

export default async function BatchesPage() {
  if (!(await getCurrentAdmin())) redirect('/admin/login')
  if (!farmReady()) redirect('/admin/farm')

  const data = await readFarm()
  // Newest first: the batch you want is almost always the most recent.
  const analyses = data.batches
    .map((batch) => analyseBatch(batch, data))
    .sort((a, b) => b.batch.batchId.localeCompare(a.batch.batchId))

  return (
    <>
      <Link href="/admin/farm" className="press inline-flex items-center gap-1.5 text-[0.875rem] text-earth-muted hover:text-forest">
        <Icon name="chevron-right" size={15} className="rotate-180" />
        Farm
      </Link>

      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-[1.75rem] text-forest">Batches</h1>
        <p className="text-[0.8125rem] text-earth-muted">{analyses.length} in total</p>
      </div>

      <div className="mt-5">
        <CreateBatch />
      </div>

      {analyses.length === 0 ? (
        <div className="mt-6 rounded-sm border border-dashed border-beige bg-ivory p-10 text-center">
          <Icon name="leaf" size={24} className="mx-auto text-earth-muted/60" />
          <p className="mt-3 text-[1rem] text-earth-soft">No batches yet</p>
          <p className="mx-auto mt-1.5 max-w-[40ch] text-[0.875rem] leading-relaxed text-earth-muted">
            Create one above. Bag records are generated automatically from the bag count.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-2.5">
          {analyses.map((a) => (
            <li key={a.batch.batchId}>
              {/* A card, not a table row: a wide table on a phone is unusable,
                  and this list is read standing up more often than at a desk. */}
              <Link
                href={`/admin/farm/batches/${a.batch.batchId}`}
                className="press block rounded-sm border border-beige bg-ivory p-4 transition-colors hover:border-forest/30"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[0.9375rem] text-forest">{a.batch.batchId}</span>
                  <Badge tone={TONE[a.batch.stage]}>{a.batch.stage}</Badge>
                  <span className="text-[0.875rem] text-earth-soft">{a.batch.variety}</span>
                </div>
                <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1 text-[0.8125rem] sm:grid-cols-4">
                  <Stat label="Bags" value={`${a.health.remaining}/${a.health.prepared}`} />
                  <Stat label="Harvest" value={`${a.production.totalKg} kg`} />
                  <Stat
                    label="Contamination"
                    value={a.health.contaminationRate === undefined ? '—' : `${a.health.contaminationRate.toFixed(1)}%`}
                  />
                  <Stat
                    label="Profit"
                    value={a.economics.revenue > 0 || a.economics.totalCost > 0 ? (formatPrice(a.economics.profit, 'INR') ?? '—') : '—'}
                  />
                </dl>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-earth-muted">{label}</dt>
      <dd className="text-earth">{value}</dd>
    </div>
  )
}
