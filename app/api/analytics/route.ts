import { NextResponse, type NextRequest } from 'next/server'
import { analyticsEventSchema } from '@/lib/validation/schemas'
import { anonymousSessionHash, recordEvent } from '@/lib/analytics/server'

/**
 * Analytics ingest.
 *
 * A route handler rather than a Server Action because `navigator.sendBeacon`
 * can only POST to a URL — and beacons are what make outbound-link events
 * (WhatsApp, Instagram) survive the page unloading.
 *
 * Always answers 204, whatever happened. A visitor's browser has no business
 * learning about our schema, and a failed metric is not their problem.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NO_CONTENT = () => new NextResponse(null, { status: 204 })

export async function POST(request: NextRequest) {
  try {
    // Cap the body: sendBeacon payloads are tiny, so anything large is abuse.
    const text = await request.text()
    if (text.length > 2048) return NO_CONTENT()

    const parsed = analyticsEventSchema.safeParse(JSON.parse(text))
    if (!parsed.success) return NO_CONTENT()

    const ip =
      request.headers.get('cf-connecting-ip') ??
      request.headers.get('x-real-ip') ??
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      null

    await recordEvent({
      eventName: parsed.data.event_name,
      path: parsed.data.path,
      referrer: request.headers.get('referer'),
      props: parsed.data.props,
      sessionHash: await anonymousSessionHash(ip),
    })
  } catch {
    // Malformed JSON, missing service role, database hiccup — all silent.
  }

  return NO_CONTENT()
}
