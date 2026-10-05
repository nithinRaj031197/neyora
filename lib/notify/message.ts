import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  addressLines,
  describeItem,
  type Order,
} from '@/lib/orders/schema'
import { formatPrice } from '@/lib/utils/format'

/**
 * One order, written out once.
 *
 * Every channel renders the same facts, so they are assembled here rather than
 * inside each provider — otherwise a second channel's message and the email
 * drift apart, and the one you happen to read is the one missing the pincode.
 *
 * Deliberately pure: no network, no environment, no `server-only`. That is what
 * makes it testable without a database or a provider account.
 */

export interface OrderMessage {
  /** Email subject, and the first line of anything that has no subject. */
  subject: string
  /**
   * Plain text: the email's text/plain part, and what any future
   * message-based channel (WhatsApp, SMS) would render from.
   */
  text: string
  /** A full email document. */
  html: string
}

/** IST, because that is the clock the farm and the customer are both on. */
export function formatIst(date: Date): string {
  return date.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  })
}

/** Display form of a stored 10-digit number. */
export function formatPhone(phone: string): string {
  return phone.length === 10 ? `+91 ${phone.slice(0, 5)} ${phone.slice(5)}` : phone
}

/**
 * The five characters that can break an HTML document.
 *
 * Customer-supplied text — a name, a landmark, a note — goes into the email,
 * and a stray `<` in "flat <3" would silently swallow the rest of the message.
 * Every value is escaped on the way in rather than trusted at the source.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function buildOrderMessage(order: Order, adminUrl: string): OrderMessage {
  const money = (n: number) => formatPrice(n, 'INR') ?? `₹${n}`
  const address = addressLines(order.customer.address)
  const payment = `${PAYMENT_METHOD_LABELS[order.payment.method]} — ${PAYMENT_STATUS_LABELS[
    order.payment.status
  ].toUpperCase()}`

  const subject = `New NEYORA order — ${order.reference}`

  const text = [
    '🍄 NEW NEYORA ORDER',
    '',
    `Order: ${order.reference}`,
    '',
    'CUSTOMER',
    order.customer.name,
    formatPhone(order.customer.phone),
    '',
    'DELIVERY',
    ...address,
    '',
    'ORDER',
    ...order.items.map(describeItem),
    '',
    `Total: ${money(order.total)}`,
    '',
    'PAYMENT',
    payment,
    '',
    ...(order.customer.note ? ['NOTE', order.customer.note, ''] : []),
    `Placed: ${formatIst(order.createdAt)}`,
    '',
    `Open order: ${adminUrl}`,
  ].join('\n')

  return { subject, text, html: buildEmailHtml(order, adminUrl, address, payment) }
}

/**
 * The email.
 *
 * Table-based layout with inline styles, because that is still the only thing
 * every mail client renders the same way — Gmail strips `<style>` blocks, and
 * Outlook's engine is Word. It is not how the website is built and it should
 * not be: this is a different medium with different rules.
 */
function buildEmailHtml(
  order: Order,
  adminUrl: string,
  address: string[],
  payment: string,
): string {
  const money = (n: number) => formatPrice(n, 'INR') ?? `₹${n}`
  const unpaid = order.payment.status !== 'paid'

  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #e9dfd0;font:500 12px/1.4 Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#6f6a5e;width:132px;vertical-align:top">${escapeHtml(
        label,
      )}</td>
      <td style="padding:10px 0;border-bottom:1px solid #e9dfd0;font:400 15px/1.55 Arial,sans-serif;color:#2b2923">${value}</td>
    </tr>`

  const items = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding:6px 0;font:400 15px/1.55 Arial,sans-serif;color:#2b2923">
          <strong style="color:#123c2a">${escapeHtml(String(item.quantity))} ×</strong>
          ${escapeHtml(item.name)}
          <span style="color:#6f6a5e">(${escapeHtml(item.packLabel)})</span>
        </td>
        <td style="padding:6px 0;text-align:right;font:400 15px/1.55 Arial,sans-serif;color:#2b2923;white-space:nowrap">${escapeHtml(
          money(item.unitPrice * item.quantity),
        )}</td>
      </tr>`,
    )
    .join('')

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(order.reference)}</title></head>
<body style="margin:0;padding:0;background:#f6f0e3">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f0e3">
 <tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fbf8f1;border:1px solid #d8c9b5;border-radius:3px">
   <tr><td style="padding:28px 28px 20px">
     <p style="margin:0;font:500 11px/1.4 Arial,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#3f7d3a">NEYORA — new order</p>
     <p style="margin:10px 0 0;font:700 28px/1.2 Georgia,serif;color:#123c2a">${escapeHtml(
       order.reference,
     )}</p>
     <p style="margin:6px 0 0;font:400 14px/1.5 Arial,sans-serif;color:#6f6a5e">${escapeHtml(
       formatIst(order.createdAt),
     )}</p>
   </td></tr>

   <tr><td style="padding:0 28px">
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
       ${row('Customer', escapeHtml(order.customer.name))}
       ${row(
         'Phone',
         `<a href="tel:+91${escapeHtml(order.customer.phone)}" style="color:#123c2a">${escapeHtml(
           formatPhone(order.customer.phone),
         )}</a>`,
       )}
       ${row('Delivery', address.map(escapeHtml).join('<br>'))}
       ${
         order.customer.note
           ? row('Note', `<em>${escapeHtml(order.customer.note)}</em>`)
           : ''
       }
     </table>
   </td></tr>

   <tr><td style="padding:22px 28px 0">
     <p style="margin:0 0 6px;font:500 12px/1.4 Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#6f6a5e">Order</p>
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items}</table>
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;border-top:1px solid #d8c9b5">
       <tr>
         <td style="padding:12px 0 0;font:700 15px/1.4 Arial,sans-serif;color:#123c2a">Total</td>
         <td style="padding:12px 0 0;text-align:right;font:700 20px/1.3 Georgia,serif;color:#123c2a">${escapeHtml(
           money(order.total),
         )}</td>
       </tr>
     </table>
   </td></tr>

   <tr><td style="padding:22px 28px 0">
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${
       unpaid ? '#fdf4e8' : '#eef5ea'
     };border:1px solid ${unpaid ? '#e3c58f' : '#bcd6b4'};border-radius:3px">
       <tr><td style="padding:12px 14px">
         <p style="margin:0;font:500 12px/1.4 Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#6f6a5e">Payment</p>
         <p style="margin:4px 0 0;font:700 15px/1.4 Arial,sans-serif;color:${
           unpaid ? '#b07d1f' : '#3f7d3a'
         }">${escapeHtml(payment)}</p>
       </td></tr>
     </table>
   </td></tr>

   <tr><td style="padding:24px 28px 30px">
     <a href="${escapeHtml(adminUrl)}"
        style="display:inline-block;background:#123c2a;color:#f6f0e3;text-decoration:none;padding:13px 24px;border-radius:3px;font:500 13px/1 Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase">Open order in admin</a>
   </td></tr>
  </table>

  <p style="margin:16px 0 0;font:400 12px/1.5 Arial,sans-serif;color:#6f6a5e">
    Sent by the NEYORA order system. Do not reply to this address.
  </p>
 </td></tr>
</table>
</body></html>`
}
