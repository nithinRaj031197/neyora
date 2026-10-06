import 'server-only'
import { googleCredentials, normalisePrivateKey } from '@/lib/google/credentials'

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

/** Re-exported so existing callers and tests keep one import site. */
export { normalisePrivateKey }

export function sheetsConfig(): SheetsConfig | null {
  const spreadsheetId = read('GOOGLE_SHEETS_ID')
  // One service account, many spreadsheets: the credentials are shared with
  // the farm workbook, only the spreadsheet id differs.
  const credentials = googleCredentials()
  if (!spreadsheetId || !credentials) return null

  return {
    spreadsheetId,
    sheetName: read('GOOGLE_SHEETS_TAB') ?? 'Orders',
    clientEmail: credentials.clientEmail,
    privateKey: credentials.privateKey,
  }
}

/** For the admin dashboard. Reports configured-or-not, never the values. */
export function sheetsReadiness(): boolean {
  return sheetsConfig() !== null
}
