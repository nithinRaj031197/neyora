import 'server-only'

/**
 * The Google service-account credentials, shared by every spreadsheet.
 *
 * ONE service account, MANY spreadsheets. The ecommerce Orders projection and
 * the farm workbook are different documents with different lifecycles, but
 * they authenticate as the same robot — so the key lives here and each module
 * supplies only its own spreadsheet id.
 *
 * `server-only`: this module throws at build time if anything in the browser
 * bundle imports it, which is the guarantee a private key cannot reach a client
 * component by accident. Nothing here is ever named NEXT_PUBLIC_*.
 */

export interface GoogleCredentials {
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
 * imports with an opaque DOMException at the first call and nowhere else.
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

export function googleCredentials(): GoogleCredentials | null {
  const clientEmail = read('GOOGLE_SERVICE_ACCOUNT_EMAIL')
  const rawKey = read('GOOGLE_PRIVATE_KEY')
  if (!clientEmail || !rawKey) return null

  const privateKey = normalisePrivateKey(rawKey)
  // A key that is not PEM fails at import with a message that says nothing
  // useful. Better to notice the shape here, where it can be explained.
  if (!privateKey.includes('BEGIN PRIVATE KEY')) {
    console.error(
      '[google] GOOGLE_PRIVATE_KEY does not look like a PKCS#8 PEM key ' +
        '(expected a "-----BEGIN PRIVATE KEY-----" block). Sheets access is disabled.',
    )
    return null
  }

  return { clientEmail, privateKey }
}
