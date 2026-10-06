import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentAdmin } from '@/lib/auth/session'
import { farmReady } from '@/lib/farm/config'
import { readFarm } from '@/lib/farm/repository'
import { SheetsError } from '@/lib/google/sheets'
import { analyseBatch, isoDaysAgo, summarise } from '@/lib/farm/analytics'
import { isBatchActive } from '@/lib/farm/schema'
import { BarChart, GroupedBarChart, LineChart } from '@/components/admin/farm/Charts'
import {
  AddCost,
  CreateBatch,
  RecordHarvest,
  RecordSale,
  ReportContamination,
} from '@/components/admin/farm/QuickActions'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { formatPrice } from '@/lib/utils/format'

export const dynamic = 'force-dynamic'

/**
 * The farm dashboard.
 *
 * Operational first: the quick actions come before the charts, because the
 * reason to open this on a phone is usually to record something, not to read
 * it. Every number comes from lib/farm/analytics, so nothing here can disagree
 * with the batch detail screen.
 */
export default async function FarmPage() {
  // The real check. The layout's is for chrome only.
  if (!(await getCurrentAdmin())) redirect('/admin/login')

  if (!farmReady()) return <NotConfigured />

  let data
  try {
    data = await readFarm()
  } catch (error) {
    console.error('[farm] could not read the workbook', error)
    /*
     * 403 is not a connection problem and never clears by itself: the
     * spreadsheet exists but has not been shared with the service account.
     * Telling the admin to "try again shortly" would have them waiting for
     * something that cannot happen, so the two cases are told apart.
     */
    const denied = error instanceof SheetsError && (error.status === 403 || error.status === 404)
    return <Unreachable denied={denied} />
  }

  const analyses = data.batches.map((batch) => analyseBatch(batch, data))
  const summary = summarise(analyses, data.harvests)
  const active = analyses.filter((a) => isBatchActive(a.batch.stage))

  const options = data.batches
    .filter((b) => isBatchActive(b.stage))
    .map((b) => ({ batchId: b.batchId, label: b.label ?? b.batchId, variety: b.variety, stage: b.stage, updatedAt: b.updatedAt }))

  // Harvest by day, oldest first — the shape a trend line needs.
  const byDate = new Map<string, number>()
  for (const h of data.harvests) {
    if (!h.date) continue
    byDate.set(h.date, (byDate.get(h.date) ?? 0) + h.totalKg)
  }
  const trend = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, value]) => ({ label: date.slice(5), value: Math.round(value * 100) / 100 }))

  const withHarvest = analyses.filter((a) => a.production.totalKg > 0)
  const withMoney = analyses.filter((a) => a.economics.totalCost > 0 || a.economics.revenue > 0)
  const withBags = analyses.filter((a) => a.health.prepared > 0)

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-[1.75rem] text-forest">Farm</h1>
        <Link href="/admin/farm/batches" className="press text-[0.875rem] text-forest underline underline-offset-4">
          All batches
        </Link>
      </div>

      {data.issues.length > 0 ? (
        <p role="status" className="mt-4 flex items-start gap-2.5 rounded-sm border border-warning/40 bg-warning/10 px-4 py-3 text-[0.8125rem] text-warning">
          <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
          <span>
            {data.issues.length} row{data.issues.length === 1 ? '' : 's'} in the spreadsheet could not
            be read and {data.issues.length === 1 ? 'is' : 'are'} excluded:{' '}
            {data.issues.slice(0, 3).map((i) => `${i.tab} row ${i.row} — ${i.problem}`).join('; ')}
            {data.issues.length > 3 ? ' and more.' : '.'}
          </span>
        </p>
      ) : null}

      <dl className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Active batches" value={String(summary.activeBatches)} />
        <Kpi label="Bags growing" value={String(summary.bagsRemaining)} hint={`${summary.bagsPrepared} prepared`} />
        <Kpi
          label="Contamination"
          value={summary.contaminationRate === undefined ? '—' : `${summary.contaminationRate}%`}
          hint={`${summary.bagsAffected} bags`}
          tone={summary.contaminationRate !== undefined && summary.contaminationRate > 15 ? 'danger' : undefined}
        />
        <Kpi label="Harvest this week" value={`${summary.harvestThisWeekKg} kg`} hint={`${summary.harvestThisMonthKg} kg this month`} />
        <Kpi label="Total harvest" value={`${summary.totalHarvestKg} kg`} hint={`${summary.saleableHarvestKg} kg saleable`} />
        <Kpi label="Cost" value={formatPrice(summary.totalCost, 'INR') ?? '—'} />
        <Kpi label="Revenue" value={formatPrice(summary.revenue, 'INR') ?? '—'} />
        <Kpi
          label="Profit"
          value={formatPrice(summary.profit, 'INR') ?? '—'}
          tone={summary.profit < 0 ? 'danger' : 'good'}
        />
      </dl>

      {/* Entry before analysis: the common reason to open this is to record. */}
      <h2 className="mt-9 text-[0.75rem] font-medium tracking-[0.1em] text-earth-muted uppercase">
        Record something
      </h2>
      <div className="mt-3 grid gap-2.5">
        {options.length > 0 ? (
          <>
            <RecordHarvest batches={options} />
            <ReportContamination batches={options} />
            <AddCost batches={options} />
            <RecordSale batches={options} />
          </>
        ) : (
          <p className="rounded-sm border border-dashed border-beige bg-ivory px-4 py-5 text-center text-[0.875rem] text-earth-muted">
            No active batches yet. Create one to start recording.
          </p>
        )}
        <CreateBatch />
      </div>

      <h2 className="mt-9 text-[0.75rem] font-medium tracking-[0.1em] text-earth-muted uppercase">
        How it is going
      </h2>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <LineChart
          title="Harvest trend"
          hint="Total fresh weight per harvest day"
          points={trend}
          empty="Two harvest days are needed before a trend means anything."
        />
        <BarChart
          title="Yield per bag prepared"
          hint="Total harvest ÷ bags prepared — losses included"
          points={withHarvest.map((a) => ({ label: a.batch.batchId, value: a.yields.perBagPrepared ?? 0 }))}
          unit="kg"
          empty="Record a harvest to compare batches."
        />
        <BarChart
          title="Contamination by batch"
          hint="Affected bags ÷ bags prepared"
          tone="danger"
          points={withBags.map((a) => ({ label: a.batch.batchId, value: a.health.contaminationRate ?? 0 }))}
          format={(v) => `${v.toFixed(1)}%`}
          empty="No batches with bags yet."
        />
        <GroupedBarChart
          title="Cost against revenue"
          hint="Per batch, with profit on the right"
          rows={withMoney.map((a) => ({ label: a.batch.batchId, a: a.economics.totalCost, b: a.economics.revenue }))}
          format={(v) => formatPrice(v, 'INR') ?? String(v)}
          empty="Add a cost or a sale to see batch economics."
        />
      </div>

      {active.length > 0 ? (
        <>
          <h2 className="mt-9 text-[0.75rem] font-medium tracking-[0.1em] text-earth-muted uppercase">
            Active batches
          </h2>
          <ul className="mt-3 grid gap-2.5">
            {active.map((a) => (
              <li key={a.batch.batchId}>
                <Link
                  href={`/admin/farm/batches/${a.batch.batchId}`}
                  className="press flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-sm border border-beige bg-ivory px-4 py-3.5 transition-colors hover:border-forest/30"
                >
                  <span className="font-mono text-[0.875rem] text-forest">{a.batch.batchId}</span>
                  <Badge tone="leaf">{a.batch.stage}</Badge>
                  <span className="text-[0.875rem] text-earth-soft">{a.batch.variety}</span>
                  <span className="ml-auto text-[0.8125rem] text-earth-muted">
                    {a.health.remaining}/{a.health.prepared} bags · {a.production.totalKg} kg
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <p className="mt-8 text-[0.75rem] text-earth-muted">
        Data since {isoDaysAgo(new Date(), 90)}. The spreadsheet is the source of truth — edit it
        directly any time.
      </p>
    </>
  )
}

function Kpi({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string
  hint?: string
  tone?: 'danger' | 'good'
}) {
  return (
    <div className="rounded-sm border border-beige bg-ivory p-4">
      <dt className="text-[0.75rem] tracking-[0.08em] text-earth-muted uppercase">{label}</dt>
      <dd
        className={
          tone === 'danger'
            ? 'mt-1.5 font-display text-[1.5rem] leading-none text-danger'
            : tone === 'good'
              ? 'mt-1.5 font-display text-[1.5rem] leading-none text-botanical'
              : 'mt-1.5 font-display text-[1.5rem] leading-none text-forest'
        }
      >
        {value}
      </dd>
      {hint ? <dd className="mt-1 text-[0.75rem] text-earth-muted">{hint}</dd> : null}
    </div>
  )
}

function NotConfigured() {
  return (
    <>
      <h1 className="font-display text-[1.75rem] text-forest">Farm</h1>
      <div className="mt-6 rounded-sm border border-dashed border-beige bg-ivory p-8">
        <p className="text-[0.9375rem] text-earth-soft">
          The farm workbook is not set up yet.
        </p>
        <p className="mt-3 max-w-[60ch] text-[0.875rem] leading-relaxed text-earth-muted">
          Create a second Google spreadsheet, share it with the NEYORA service account as an editor,
          and set <code className="font-mono">FARM_GOOGLE_SHEETS_ID</code> to its id. The six tabs
          and their headers are created automatically on first use — do not build them by hand.
        </p>
      </div>
    </>
  )
}

function Unreachable({ denied }: { denied: boolean }) {
  return (
    <>
      <h1 className="font-display text-[1.75rem] text-forest">Farm</h1>
      <p className="mt-6 rounded-sm border border-danger/35 bg-danger/8 px-4 py-3.5 text-[0.875rem] text-danger">
        {denied ? (
          <>
            The farm spreadsheet exists but NEYORA cannot open it. Share it with the service account
            as an <strong>Editor</strong>, or check that FARM_GOOGLE_SHEETS_ID points at the right
            document. Nothing has been lost — this is a permission setting, not your data.
          </>
        ) : (
          <>
            Could not reach the farm spreadsheet. Your data is safe in Google Sheets — this is a
            connection problem. Try again shortly.
          </>
        )}
      </p>
    </>
  )
}
