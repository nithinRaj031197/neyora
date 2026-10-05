import { NextResponse } from 'next/server'
import { listUnnotified, listUnsynced } from '@/lib/orders/repository'
import { deliverOrderNotifications } from '@/lib/notify/dispatch'
import { syncAndRecord } from '@/lib/sheets/sync'

/**
 * Retry the things that happen after an order is stored.
 *
 * The safety net under `ctx.waitUntil`. That primitive is reliable but not
 * guaranteed — a Worker invocation can be cut short — and an order the admin
 * never heard about is the one failure in this system that costs a sale.
 *
 * One endpoint for both the admin alert and the spreadsheet projection,
 * because they share a shape: work that happens after the order is safe, that
 * can fail without affecting it, and that must eventually catch up. They stay
 * separate modules — a notification fires once, a projection is rewritten on
 * every change — but there is no reason to schedule them twice.
 *
 * Deliberately an HTTP endpoint rather than a queue or a Cloudflare Cron
 * Trigger. A queue is three moving parts to deliver a handful of messages a
 * day, and OpenNext does not expose a `scheduled` handler, so a cron trigger
 * would need a second Worker. An endpoint can be called by anything — a
 * Cloudflare cron on a tiny separate Worker, cron-job.org, a GitHub Action, or
 * a person — and it costs one file.
 *
 * WITHOUT `SYNC_RETRY_SECRET` SET, THIS ROUTE DOES NOT EXIST. It returns 404
 * rather than 401, so an unconfigured deployment does not advertise that there
 * is an endpoint here to guess at.
 */

export const dynamic = 'force-dynamic'

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.SYNC_RETRY_SECRET?.trim()
  if (!secret) return new NextResponse(null, { status: 404 })

  const offered = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  if (!offered || !timingSafeEqual(offered, secret)) {
    return new NextResponse(null, { status: 404 })
  }

  try {
    /*
     * Two minutes old, at least. Anything newer still has its original
     * `waitUntil` attempt in flight, and racing it would send the admin the
     * same order twice.
     */
    const [alerts, sheets] = await Promise.all([
      listUnnotified({ olderThanMs: 120_000, limit: 20, maxAttempts: 5 }),
      listUnsynced({ limit: 20, maxAttempts: 5 }),
    ])

    // Sequential, not parallel. Twenty orders firing at two providers at once
    // is a burst that looks like abuse; a retry has no deadline worth that.
    for (const order of alerts) {
      // A channel already recorded as sent is never re-delivered — see
      // deliverOrderNotifications.
      await deliverOrderNotifications(order)
    }
    for (const order of sheets) {
      // An idempotent upsert keyed on the order reference: running it again
      // rewrites the same rows rather than adding more.
      await syncAndRecord(order)
    }

    return NextResponse.json({ alertsRetried: alerts.length, sheetsRetried: sheets.length })
  } catch (error) {
    console.error('[sync] retry sweep failed', error)
    return NextResponse.json({ error: 'sweep failed' }, { status: 500 })
  }
}

/**
 * Constant-time comparison.
 *
 * `===` on a secret leaks its length and its matching prefix through timing.
 * `crypto.timingSafeEqual` is a Node built-in that is not in the Workers
 * runtime, so this is written against primitives that exist in both.
 */
function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder()
  const left = encoder.encode(a)
  const right = encoder.encode(b)
  // Length is compared separately and the loop still runs, so a wrong-length
  // guess takes the same time as a wrong-value one.
  let mismatch = left.length === right.length ? 0 : 1
  const length = Math.max(left.length, right.length)
  for (let i = 0; i < length; i += 1) {
    mismatch |= (left[i] ?? 0) ^ (right[i] ?? 0)
  }
  return mismatch === 0
}
