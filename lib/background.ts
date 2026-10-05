import 'server-only'

/**
 * Run work after the response has been sent.
 *
 * NOT `after()` from next/server. On this stack — Next.js adapted by
 * @opennextjs/cloudflare and deployed as a Worker — `after()` is an open bug
 * (opennextjs-cloudflare#912): the callback runs in `next dev` and is
 * intermittently cut off in production, which is the worst possible shape for
 * work nobody is watching. `ctx.waitUntil` is the platform primitive `after()`
 * is supposed to be built on, and it works.
 *
 * Off Workers (`next dev`, `next start`, tests) there is no context, so the
 * work is simply awaited. That costs the local developer a second on submit
 * and buys them seeing the error immediately, which is the right trade for an
 * environment with no observability.
 *
 * Lives here rather than inside lib/notify because it is about the platform,
 * not about notifications — the Google Sheets projection needs exactly the
 * same thing.
 */
export async function runAfterResponse(
  task: Promise<unknown>,
  label = 'background',
): Promise<void> {
  // Swallowed here as well as inside each caller. A rejected promise handed to
  // waitUntil is an unhandled rejection that can fail the whole invocation.
  const guarded = task.catch((error) => {
    console.error(`[${label}] background task failed`, error)
  })

  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare')
    getCloudflareContext().ctx.waitUntil(guarded)
  } catch {
    // Not running on Workers. Await it, so a local failure is visible now.
    await guarded
  }
}
