import 'server-only'
import { googleCredentials } from '@/lib/google/credentials'

/**
 * The farm workbook's configuration.
 *
 * A SEPARATE spreadsheet from the ecommerce Orders projection, deliberately:
 * different lifecycle, different source of truth, different people editing it.
 * Only the service account is shared.
 */
export function farmSheetId(): string | null {
  const id = process.env.FARM_GOOGLE_SHEETS_ID?.trim()
  if (!id) return null
  // Guard against the two workbooks being pointed at the same document, which
  // would let the farm module write its tabs into the Orders spreadsheet.
  if (id === process.env.GOOGLE_SHEETS_ID?.trim()) {
    console.error(
      '[farm] FARM_GOOGLE_SHEETS_ID is the same as GOOGLE_SHEETS_ID. ' +
        'The farm workbook must be a separate spreadsheet; farm access is disabled.',
    )
    return null
  }
  return id
}

export function farmReady(): boolean {
  return farmSheetId() !== null && googleCredentials() !== null
}
