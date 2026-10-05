import 'server-only'
import { getAccessToken } from './auth'
import type { SheetsConfig } from './config'
import { COLUMN, SHEET_HEADERS, type SheetRow } from './mapping'

/**
 * The slice of the Sheets REST API this project needs.
 *
 * Four calls: read a column, append rows, update rows, and create the tab with
 * its header. Written against `fetch` because that is all the Workers runtime
 * has, and all these endpoints require.
 */

const API = 'https://sheets.googleapis.com/v4/spreadsheets'
const TIMEOUT_MS = 15_000

async function call<T>(
  config: SheetsConfig,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = await getAccessToken(config)

  // Without a timeout a hung request holds the Worker invocation open until
  // the platform kills it, and the sync result is never recorded.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(`${API}/${config.spreadsheetId}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        ...init.headers,
      },
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`Sheets ${response.status}: ${body.slice(0, 300)}`)
    }
    return (await response.json()) as T
  } finally {
    clearTimeout(timer)
  }
}

const quoted = (sheetName: string) => encodeURIComponent(`'${sheetName.replace(/'/g, "''")}'`)

/**
 * Every Row Key currently in the sheet, mapped to its 1-based row number.
 *
 * Column A only. Reading the whole sheet to find one row would transfer every
 * order on every sync; one column is a few bytes per order and is what makes
 * the single-order upsert cheap.
 *
 * On a duplicate key the FIRST occurrence wins. That is the row the single-order
 * sync will keep updating, so a duplicate introduced by a manual edit stays
 * frozen rather than being written to — and the reconcile reports it instead of
 * quietly picking one.
 */
export async function readRowKeys(config: SheetsConfig): Promise<Map<string, number>> {
  const range = `${quoted(config.sheetName)}!A:A`
  const data = await call<{ values?: string[][] }>(config, `/values/${range}`)
  const keys = new Map<string, number>()

  // Row 1 is the header, so a value at index i lives on spreadsheet row i + 1.
  ;(data.values ?? []).forEach((row, index) => {
    const key = row[0]?.trim()
    if (key && index > 0 && !keys.has(key)) keys.set(key, index + 1)
  })
  return keys
}

export interface SheetRowRecord {
  key: string
  rowNumber: number
  values: unknown[]
}

export interface SheetContents {
  /** First occurrence of each Row Key. */
  byKey: Map<string, SheetRowRecord>
  /** Keys appearing more than once, with every row number they occupy. */
  duplicates: Map<string, number[]>
  /** Data rows present, excluding the header. */
  totalRows: number
}

/**
 * The whole Orders tab, for a reconcile.
 *
 * Reads every column so a row can be compared against what MongoDB says and
 * left alone when it already matches — which is what makes "rows already
 * current" a real number rather than a rewrite of the entire sheet.
 *
 * `UNFORMATTED_VALUE` is essential: the default returns *formatted* values, so
 * a price cell comes back as "₹300" rather than 300 and every row would look
 * changed on every run.
 *
 * Only used by the reconcile. The per-order sync still reads column A alone.
 */
export async function readSheetContents(config: SheetsConfig): Promise<SheetContents> {
  const lastColumn = String.fromCharCode(64 + SHEET_HEADERS.length)
  const range = `${quoted(config.sheetName)}!A:${lastColumn}`
  const data = await call<{ values?: unknown[][] }>(
    config,
    `/values/${range}?valueRenderOption=UNFORMATTED_VALUE`,
  )

  const byKey = new Map<string, SheetRowRecord>()
  const seen = new Map<string, number[]>()
  let totalRows = 0

  ;(data.values ?? []).forEach((values, index) => {
    if (index === 0) return // header
    const key = String(values[0] ?? '').trim()
    if (!key) return
    totalRows += 1

    const rowNumber = index + 1
    seen.set(key, [...(seen.get(key) ?? []), rowNumber])
    // First occurrence is the canonical one; later ones are duplicates.
    if (!byKey.has(key)) byKey.set(key, { key, rowNumber, values })
  })

  const duplicates = new Map(
    [...seen.entries()].filter(([, rowNumbers]) => rowNumbers.length > 1),
  )

  return { byKey, duplicates, totalRows }
}

export async function appendRows(config: SheetsConfig, rows: SheetRow[]): Promise<void> {
  if (rows.length === 0) return
  const range = `${quoted(config.sheetName)}!A:A`
  await call(
    config,
    `/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    { method: 'POST', body: JSON.stringify({ values: rows }) },
  )
}

/** Overwrite specific rows in place. The key to idempotency. */
export async function updateRows(
  config: SheetsConfig,
  updates: { rowNumber: number; row: SheetRow }[],
): Promise<void> {
  if (updates.length === 0) return
  await call(config, '/values:batchUpdate', {
    method: 'POST',
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: updates.map(({ rowNumber, row }) => ({
        range: `${config.sheetName}!A${rowNumber}`,
        values: [row],
      })),
    }),
  })
}

/**
 * Make sure the tab exists and carries its header row.
 *
 * Called on the first sync of a process rather than from a setup step, because
 * there is no setup step — the admin creates a spreadsheet and shares it, and
 * everything else is the application's job. Both operations are safe to repeat:
 * a tab that exists is left alone, and the header is rewritten to the same
 * values.
 */
export async function ensureSheet(config: SheetsConfig): Promise<void> {
  const meta = await call<{ sheets?: { properties?: { title?: string; sheetId?: number } }[] }>(
    config,
    '?fields=sheets.properties(title,sheetId)',
  )
  const existing = (meta.sheets ?? []).find((s) => s.properties?.title === config.sheetName)

  let sheetId = existing?.properties?.sheetId
  const created = !existing

  if (created) {
    const result = await call<{
      replies?: { addSheet?: { properties?: { sheetId?: number } } }[]
    }>(config, ':batchUpdate', {
      method: 'POST',
      body: JSON.stringify({
        requests: [{ addSheet: { properties: { title: config.sheetName } } }],
      }),
    })
    sheetId = result.replies?.[0]?.addSheet?.properties?.sheetId
  }

  const range = `${quoted(config.sheetName)}!A1`
  await call(config, `/values/${range}?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values: [[...SHEET_HEADERS]] }),
  })

  /*
   * Formatting is applied ONCE, when this tab is created, and never again.
   *
   * Two reasons. Re-applying on every start would stomp any column width or
   * colour the admin set by hand — the sheet is theirs to read, and a tool that
   * silently undoes their changes is one they stop trusting. And a formatting
   * call is the part of this most likely to fail on a future API change, so it
   * should not sit in the path of every sync.
   *
   * It is deliberately best-effort: a failure here is logged and swallowed.
   * Data correctness matters, appearance does not.
   */
  if (created && typeof sheetId === 'number') {
    await formatSheet(config, sheetId).catch((error: unknown) => {
      console.error('[sheets] could not apply formatting (data is unaffected)', error)
    })
  }
}

/** Currency-formatted columns, by name so a reordering cannot misalign them. */
const RUPEE_COLUMNS = ['Unit Price (₹)', 'Line Total (₹)', 'Order Total (₹)'] as const

/**
 * Make the Orders tab readable by a human.
 *
 * Frozen bold header, a filter row, sensible widths and ₹ formatting on the
 * money columns. Nothing here affects what the sync writes.
 */
async function formatSheet(config: SheetsConfig, sheetId: number): Promise<void> {
  const lastColumn = SHEET_HEADERS.length

  const requests: unknown[] = [
    // The header stays put while scrolling a long list.
    {
      updateSheetProperties: {
        properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
        fields: 'gridProperties.frozenRowCount',
      },
    },
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
        cell: {
          userEnteredFormat: {
            textFormat: { bold: true },
            // NEYORA beige, so the header reads as part of the brand rather
            // than as a default spreadsheet.
            backgroundColor: { red: 0.906, green: 0.875, blue: 0.816 },
            verticalAlignment: 'MIDDLE',
          },
        },
        fields: 'userEnteredFormat(textFormat,backgroundColor,verticalAlignment)',
      },
    },
    // Sort and filter from the header row.
    {
      setBasicFilter: {
        filter: { range: { sheetId, startRowIndex: 0, startColumnIndex: 0, endColumnIndex: lastColumn } },
      },
    },
    // A readable default for every column, then wider ones where the content
    // genuinely needs it.
    {
      updateDimensionProperties: {
        range: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: lastColumn },
        properties: { pixelSize: 120 },
        fields: 'pixelSize',
      },
    },
    ...['Customer Name', 'Address Line 1', 'Address Line 2', 'Landmark', 'Product'].map(
      (header) => ({
        updateDimensionProperties: {
          range: {
            sheetId,
            dimension: 'COLUMNS',
            startIndex: COLUMN[header as keyof typeof COLUMN],
            endIndex: COLUMN[header as keyof typeof COLUMN] + 1,
          },
          properties: { pixelSize: 200 },
          fields: 'pixelSize',
        },
      }),
    ),
    // Rupees, no decimals: NEYORA prices in whole rupees.
    ...RUPEE_COLUMNS.map((header) => ({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 1,
          startColumnIndex: COLUMN[header],
          endColumnIndex: COLUMN[header] + 1,
        },
        cell: {
          userEnteredFormat: { numberFormat: { type: 'CURRENCY', pattern: '[$₹]#,##0' } },
        },
        fields: 'userEnteredFormat.numberFormat',
      },
    })),
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 1,
          startColumnIndex: COLUMN['Quantity'],
          endColumnIndex: COLUMN['Quantity'] + 1,
        },
        cell: { userEnteredFormat: { numberFormat: { type: 'NUMBER', pattern: '0' } } },
        fields: 'userEnteredFormat.numberFormat',
      },
    },
  ]

  await call(config, ':batchUpdate', {
    method: 'POST',
    body: JSON.stringify({ requests }),
  })
}
