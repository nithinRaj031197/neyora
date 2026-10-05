import 'server-only'

/**
 * Google Sheets credentials.
 *
 * `server-only`: this module throws at build time if anything in the browser
 * bundle imports it, which is the guarantee a private key cannot reach a
 * client component by accident. Nothing here is ever named NEXT_PUBLIC_*.
 *
 * Entirely optional, like every other channel. Missing credentials mean the
 * projection is DISABLED, not broken: orders still save, the admin still works,
 * and the sync is recorded as `skipped`. That is what lets the whole order flow
 * run locally with no Google account.
 */

export interface SheetsConfig {
  spreadsheetId: string
  /** The tab name. One sheet can later hold Sales, Harvest, P&L tabs too. */
  sheetName: string
  clientEmail: string
  /** PEM, PKCS#8. See `normalisePrivateKey` for why this needs care. */
  privateKey: string
}

const read = (name: string): string | undefined => process.env[name]?.trim() || undefined

/**
 * Put the newlines back into a PEM key.
 *
 * A PKCS#8 key is multi-line, and almost every way of getting one into an
 * environment variable mangles that: `.env` files collapse it to a single line
 * with literal `\n`, dashboards sometimes add surrounding quotes, and copy and
 * paste adds carriage returns. All three produce the same symptom — a key that
 * imports with an opaque DOMException at the first sync and nowhere else.
 */
export function normalisePrivateKey(raw: string): string {
  return raw
    .trim()
    // A value pasted with its surrounding quotes still intact.
    .replace(/^["']|["']$/g, '')
    // The literal two-character sequence backslash-n, not a newline.
    .replace(/\\n/g, '\n')
    .replace(/\r/g, '')
}

export function sheetsConfig(): SheetsConfig | null {
  const spreadsheetId = read('GOOGLE_SHEETS_ID')
  const clientEmail = read('GOOGLE_SERVICE_ACCOUNT_EMAIL')
  const rawKey = read('GOOGLE_PRIVATE_KEY')
  if (!spreadsheetId || !clientEmail || !rawKey) return null

  const privateKey = normalisePrivateKey(rawKey)
  // A key that is not PEM will fail at import with a message that says nothing
  // useful. Better to notice the shape here, where it can be explained.
  if (!privateKey.includes('BEGIN PRIVATE KEY')) {
    console.error(
      '[sheets] GOOGLE_PRIVATE_KEY does not look like a PKCS#8 PEM key ' +
        '(expected a "-----BEGIN PRIVATE KEY-----" block). Sheets sync is disabled.',
    )
    return null
  }

  return {
    spreadsheetId,
    sheetName: read('GOOGLE_SHEETS_TAB') ?? 'Orders',
    clientEmail,
    privateKey,
  }
}

/** For the admin dashboard. Reports configured-or-not, never the values. */
export function sheetsReadiness(): boolean {
  return sheetsConfig() !== null
}
