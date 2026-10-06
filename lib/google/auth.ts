import 'server-only'
import type { GoogleCredentials } from './credentials'

/**
 * A Google access token, from a service account, without an SDK.
 *
 * The `googleapis` package is Node-only: it reaches for `https`, `stream` and
 * `child_process`, pulls in gaxios, and is several megabytes in a Worker
 * bundle that has a size limit. All it does for this use case is sign a JWT
 * and exchange it for a token — which is two WebCrypto calls and a fetch.
 *
 * Shared by every spreadsheet this project touches: one service account, one
 * token cache, many documents.
 *
 * Verified available in the Workers runtime: RS256 is
 * `RSASSA-PKCS1-v1_5` + SHA-256, and PKCS#8 import is supported.
 */

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
/** Read and write the one spreadsheet. Not drive, not all of Sheets. */
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets'

interface CachedToken {
  token: string
  /** Epoch ms. */
  expiresAt: number
}

/**
 * One token per process, reused until it is nearly expired.
 *
 * Google's tokens last an hour. Minting one per sync would add a round trip
 * and an RSA signature to every order for no benefit. Sixty seconds of slack
 * so a token cannot expire mid-request.
 */
let cached: CachedToken | null = null

function base64url(input: ArrayBuffer | string): string {
  const bytes =
    typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** PEM → the DER bytes WebCrypto wants. */
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '')
  const binary = atob(body)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

async function signJwt(credentials: GoogleCredentials): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = base64url(
    JSON.stringify({
      iss: credentials.clientEmail,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      // Google rejects anything over an hour. Ten minutes is ample for an
      // immediate exchange and limits the window if the JWT ever leaked.
      exp: now + 600,
    }),
  )

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(credentials.privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(`${header}.${claims}`),
  )

  return `${header}.${claims}.${base64url(signature)}`
}

export async function getAccessToken(credentials: GoogleCredentials): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token

  const assertion = await signJwt(credentials)
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })

  const body = (await response.json().catch(() => ({}))) as {
    access_token?: string
    expires_in?: number
    error_description?: string
    error?: string
  }

  if (!response.ok || !body.access_token) {
    // Google's own wording is the most useful thing here, and this never
    // reaches a customer — only the admin's sync error field.
    throw new Error(
      `Google token request failed (${response.status}): ${
        body.error_description ?? body.error ?? 'no access_token returned'
      }`,
    )
  }

  cached = {
    token: body.access_token,
    expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000,
  }
  return cached.token
}

/** Tests and credential changes need the cache not to outlive them. */
export function resetTokenCache(): void {
  cached = null
}
