import 'server-only'
import { getAccessToken } from './auth'
import { googleCredentials } from './credentials'

/**
 * A thin, schema-agnostic Google Sheets client.
 *
 * Knows nothing about orders, batches or harvests — it moves rows in and out
 * of named ranges. Both the ecommerce Orders projection and the farm workbook
 * sit on top of it, so a fix to quoting, timeouts or error shape lands once.
 *
 * Written against `fetch` because that is all the Workers runtime has, and all
 * these endpoints require.
 */

const API = 'https://sheets.googleapis.com/v4/spreadsheets'
const TIMEOUT_MS = 15_000

/** Google's own name for a cell range, with the tab quoted correctly. */
export const range = (tab: string, a1: string) =>
  encodeURIComponent(`'${tab.replace(/'/g, "''")}'!${a1}`)

/** A1 column letter for a 1-based index: 1 -> A, 27 -> AA. */
export function columnLetter(index: number): string {
  let n = index
  let letters = ''
  while (n > 0) {
    const remainder = (n - 1) % 26
    letters = String.fromCharCode(65 + remainder) + letters
    n = Math.floor((n - remainder) / 26)
  }
  return letters
}

export class SheetsError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = 'SheetsError'
  }
}

async function call<T>(spreadsheetId: string, path: string, init: RequestInit = {}): Promise<T> {
  const credentials = googleCredentials()
  if (!credentials) throw new SheetsError('Google credentials are not configured')

  const token = await getAccessToken(credentials)

  // Without a timeout a hung request holds the invocation open until the
  // platform kills it, and the caller never learns what happened.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(`${API}/${spreadsheetId}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...init.headers },
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new SheetsError(`Sheets ${response.status}: ${body.slice(0, 300)}`, response.status)
    }
    return (await response.json()) as T
  } catch (error) {
    if (error instanceof SheetsError) throw error
    if (error instanceof Error && error.name === 'AbortError') {
      throw new SheetsError(`Google Sheets timed out after ${TIMEOUT_MS}ms`)
    }
    throw new SheetsError(error instanceof Error ? error.message : String(error))
  } finally {
    clearTimeout(timer)
  }
}

export type Cell = string | number | boolean | null
export type Row = Cell[]

/** Read one rectangular range. Unformatted, so numbers come back as numbers. */
export async function readRange(
  spreadsheetId: string,
  tab: string,
  a1: string,
): Promise<Row[]> {
  const data = await call<{ values?: Row[] }>(
    spreadsheetId,
    `/values/${range(tab, a1)}?valueRenderOption=UNFORMATTED_VALUE`,
  )
  return data.values ?? []
}

/**
 * Read several ranges in ONE request.
 *
 * The reason this exists: a dashboard needs batches, harvests, contamination
 * and costs at once. Four reads is four round trips and four chances to be
 * rate-limited; `batchGet` is one.
 */
export async function readRanges(
  spreadsheetId: string,
  ranges: { tab: string; a1: string }[],
): Promise<Row[][]> {
  if (ranges.length === 0) return []
  const query = ranges.map((r) => `ranges=${range(r.tab, r.a1)}`).join('&')
  const data = await call<{ valueRanges?: { values?: Row[] }[] }>(
    spreadsheetId,
    `/values:batchGet?${query}&valueRenderOption=UNFORMATTED_VALUE`,
  )
  return (data.valueRanges ?? []).map((v) => v.values ?? [])
}

export async function appendRows(
  spreadsheetId: string,
  tab: string,
  rows: Row[],
): Promise<void> {
  if (rows.length === 0) return
  await call(
    spreadsheetId,
    `/values/${range(tab, 'A:A')}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    { method: 'POST', body: JSON.stringify({ values: rows }) },
  )
}

/** Overwrite specific rows in place, by 1-based spreadsheet row number. */
export async function updateRows(
  spreadsheetId: string,
  tab: string,
  updates: { rowNumber: number; row: Row }[],
): Promise<void> {
  if (updates.length === 0) return
  await call(spreadsheetId, '/values:batchUpdate', {
    method: 'POST',
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: updates.map(({ rowNumber, row }) => ({
        range: `${tab}!A${rowNumber}`,
        values: [row],
      })),
    }),
  })
}

export interface TabInfo {
  title: string
  sheetId: number
}

export async function listTabs(spreadsheetId: string): Promise<TabInfo[]> {
  const meta = await call<{ sheets?: { properties?: { title?: string; sheetId?: number } }[] }>(
    spreadsheetId,
    '?fields=sheets.properties(title,sheetId)',
  )
  return (meta.sheets ?? [])
    .map((s) => s.properties)
    .filter((p): p is { title: string; sheetId: number } =>
      typeof p?.title === 'string' && typeof p?.sheetId === 'number',
    )
    .map(({ title, sheetId }) => ({ title, sheetId }))
}

export async function addTab(spreadsheetId: string, title: string): Promise<number | undefined> {
  const result = await call<{ replies?: { addSheet?: { properties?: { sheetId?: number } } }[] }>(
    spreadsheetId,
    ':batchUpdate',
    { method: 'POST', body: JSON.stringify({ requests: [{ addSheet: { properties: { title } } }] }) },
  )
  return result.replies?.[0]?.addSheet?.properties?.sheetId
}

export async function writeHeader(
  spreadsheetId: string,
  tab: string,
  headers: readonly string[],
): Promise<void> {
  await call(spreadsheetId, `/values/${range(tab, 'A1')}?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values: [[...headers]] }),
  })
}

/** Arbitrary batchUpdate requests — formatting, freezing, filters. */
export async function batchUpdate(spreadsheetId: string, requests: unknown[]): Promise<void> {
  if (requests.length === 0) return
  await call(spreadsheetId, ':batchUpdate', {
    method: 'POST',
    body: JSON.stringify({ requests }),
  })
}

/**
 * Neutralise spreadsheet formula injection.
 *
 * A leading `=`, `+`, `-`, `@`, tab or carriage return makes Sheets treat a
 * cell as a formula. Any value a human typed can carry one, and
 * `=IMPORTXML(...)` in a cell runs the moment the sheet is opened — reaching
 * out to whatever host it names with whatever cells it references.
 *
 * A leading apostrophe forces text. It is not displayed and is not part of the
 * stored value, so the cell still reads exactly as written.
 */
const FORMULA_TRIGGERS = /^[=+\-@\t\r]/

export function safeText(value: string | undefined | null): string {
  const text = value ?? ''
  if (text === '' || text.startsWith("'")) return text
  return FORMULA_TRIGGERS.test(text) ? `'${text}` : text
}

/** Always text, whatever it looks like. For values Sheets would retype. */
export function forceText(value: string): string {
  return value.startsWith("'") ? value : `'${value}`
}

/** A cell as it comes back from Sheets, for comparison. */
export function normaliseCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).replace(/^'/, '').trim()
}
