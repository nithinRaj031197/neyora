import { cn } from '@/lib/utils/cn'

/**
 * Charts, hand-built in SVG.
 *
 * No charting library. The four charts here are a line, two bar variants and a
 * grouped bar — a few hundred bytes of SVG each, server-rendered, with no
 * client JavaScript at all. A library would ship 40–100 kB to the phone an
 * admin uses in a growing room, and would bring its own visual language into a
 * brand that has a very specific one.
 *
 * Every chart renders its own empty state. A farm with no completed batches
 * must not be shown an axis with nothing on it — that reads as broken rather
 * than as new.
 */

const BRAND = {
  forest: '#123c2a',
  botanical: '#3f7d3a',
  leaf: '#8baf35',
  golden: '#c6b83a',
  danger: '#9b3a2c',
  beige: '#d8c9b5',
  muted: '#6f6a5e',
}

function Empty({ label }: { label: string }) {
  return (
    <div className="flex h-40 items-center justify-center rounded-xs border border-dashed border-beige px-4 text-center">
      <p className="text-[0.8125rem] leading-relaxed text-earth-muted">{label}</p>
    </div>
  )
}

function Frame({
  title,
  hint,
  children,
  className,
}: {
  title: string
  hint?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn('rounded-sm border border-beige bg-ivory p-4 sm:p-5', className)}>
      <h3 className="text-[0.75rem] font-medium tracking-[0.1em] text-earth-muted uppercase">
        {title}
      </h3>
      {hint ? <p className="mt-1 text-[0.75rem] text-earth-muted">{hint}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  )
}

/** Nice round upper bound, so the axis label is readable. */
function niceMax(values: number[]): number {
  const max = Math.max(...values, 0)
  if (max <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(max))
  return Math.ceil(max / magnitude) * magnitude
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

// ---------------------------------------------------------------------------

export interface Point {
  label: string
  value: number
}

/**
 * Harvest over time.
 *
 * A line, because harvest is a continuous quantity sampled on dates and the
 * question is "is it rising or falling" — which a bar chart of irregular dates
 * answers badly.
 */
export function LineChart({
  title,
  hint,
  points,
  unit = 'kg',
  empty,
}: {
  title: string
  hint?: string
  points: Point[]
  unit?: string
  empty: string
}) {
  if (points.length < 2) {
    return (
      <Frame title={title} hint={hint}>
        <Empty label={empty} />
      </Frame>
    )
  }

  const W = 600
  const H = 160
  const PAD = 28
  const max = niceMax(points.map((p) => p.value))
  const step = (W - PAD * 2) / (points.length - 1)

  const coords = points.map((p, i) => ({
    x: PAD + i * step,
    y: H - PAD - (p.value / max) * (H - PAD * 2),
    ...p,
  }))
  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ')
  const area = `${path} L${coords[coords.length - 1]!.x.toFixed(1)},${H - PAD} L${PAD},${H - PAD} Z`

  return (
    <Frame title={title} hint={hint}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-40 w-full"
        role="img"
        aria-label={`${title}. ${points.map((p) => `${p.label}: ${fmt(p.value)} ${unit}`).join(', ')}`}
      >
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke={BRAND.beige} strokeWidth="1" />
        <line x1={PAD} y1={PAD} x2={W - PAD} y2={PAD} stroke={BRAND.beige} strokeWidth="1" strokeDasharray="3 4" />
        <path d={area} fill={BRAND.botanical} opacity="0.1" />
        <path d={path} fill="none" stroke={BRAND.forest} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {coords.map((c) => (
          <circle key={c.label} cx={c.x} cy={c.y} r="3" fill={BRAND.forest} />
        ))}
        <text x={PAD} y={PAD - 8} fontSize="10" fill={BRAND.muted}>
          {fmt(max)} {unit}
        </text>
        <text x={PAD} y={H - 8} fontSize="10" fill={BRAND.muted}>
          {points[0]!.label}
        </text>
        <text x={W - PAD} y={H - 8} fontSize="10" fill={BRAND.muted} textAnchor="end">
          {points[points.length - 1]!.label}
        </text>
      </svg>
    </Frame>
  )
}

/**
 * One value per batch.
 *
 * Horizontal bars, because batch IDs are long and a vertical axis would either
 * truncate them or rotate them to unreadability — and on a phone a horizontal
 * list of bars is the one chart shape that always fits.
 */
export function BarChart({
  title,
  hint,
  points,
  unit = '',
  empty,
  tone = 'forest',
  format,
}: {
  title: string
  hint?: string
  points: Point[]
  unit?: string
  empty: string
  tone?: 'forest' | 'danger'
  format?: (value: number) => string
}) {
  if (points.length === 0) {
    return (
      <Frame title={title} hint={hint}>
        <Empty label={empty} />
      </Frame>
    )
  }

  const max = niceMax(points.map((p) => p.value))
  const colour = tone === 'danger' ? BRAND.danger : BRAND.forest
  const show = format ?? ((v: number) => `${fmt(v)}${unit ? ` ${unit}` : ''}`)

  return (
    <Frame title={title} hint={hint}>
      <ul className="grid gap-2.5">
        {points.map((p) => (
          <li key={p.label} className="grid gap-1">
            <div className="flex items-baseline justify-between gap-3 text-[0.8125rem]">
              <span className="truncate font-mono text-earth-soft">{p.label}</span>
              <span className="shrink-0 font-medium text-forest">{show(p.value)}</span>
            </div>
            <div className="h-2 overflow-clip rounded-full bg-beige-soft">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max((p.value / max) * 100, p.value > 0 ? 2 : 0)}%`, background: colour }}
              />
            </div>
          </li>
        ))}
      </ul>
    </Frame>
  )
}

/**
 * Two values per batch, side by side.
 *
 * Cost against revenue is a comparison, so the bars share a scale — showing
 * them on separate axes would let a loss look like a profit.
 */
export function GroupedBarChart({
  title,
  hint,
  rows,
  empty,
  format,
}: {
  title: string
  hint?: string
  rows: { label: string; a: number; b: number }[]
  empty: string
  format: (value: number) => string
}) {
  if (rows.length === 0) {
    return (
      <Frame title={title} hint={hint}>
        <Empty label={empty} />
      </Frame>
    )
  }

  const max = niceMax(rows.flatMap((r) => [r.a, r.b]))

  return (
    <Frame title={title} hint={hint}>
      <div className="mb-3 flex flex-wrap gap-4 text-[0.75rem] text-earth-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-xs" style={{ background: BRAND.golden }} /> Cost
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-xs" style={{ background: BRAND.botanical }} /> Revenue
        </span>
      </div>
      <ul className="grid gap-3">
        {rows.map((r) => (
          <li key={r.label} className="grid gap-1">
            <div className="flex items-baseline justify-between gap-3 text-[0.8125rem]">
              <span className="truncate font-mono text-earth-soft">{r.label}</span>
              <span
                className={cn(
                  'shrink-0 font-medium',
                  r.b - r.a >= 0 ? 'text-botanical' : 'text-danger',
                )}
              >
                {r.b - r.a >= 0 ? '+' : ''}
                {format(r.b - r.a)}
              </span>
            </div>
            <div className="grid gap-1">
              <div className="h-2 overflow-clip rounded-full bg-beige-soft">
                <div className="h-full rounded-full" style={{ width: `${(r.a / max) * 100}%`, background: BRAND.golden }} />
              </div>
              <div className="h-2 overflow-clip rounded-full bg-beige-soft">
                <div className="h-full rounded-full" style={{ width: `${(r.b / max) * 100}%`, background: BRAND.botanical }} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Frame>
  )
}
