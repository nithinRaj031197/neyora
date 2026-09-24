import 'server-only'
import { cache } from 'react'
import { cookies, headers } from 'next/headers'
import { createHash, randomBytes } from 'node:crypto'
import type { Collection } from 'mongodb'
import { db } from '@/lib/db/mongo'
import { findAdmin, type AdminProfile, type Role } from './admins'

/**
 * Sessions, stored in the database rather than signed into the cookie.
 *
 * A signed JWT cannot be revoked — if a laptop is lost, the token keeps
 * working until it expires. A row can be deleted, so "sign out everywhere"
 * is a delete and nothing else.
 *
 * The cookie carries a random opaque token. Only its SHA-256 is stored, so a
 * dump of the sessions collection cannot be replayed as a login: the same
 * reason passwords are hashed.
 */

const COOKIE = 'neyora_admin'
const TTL_DAYS = 14

interface SessionRow {
  tokenHash: string
  email: string
  createdAt: Date
  expiresAt: Date
}

async function sessions(): Promise<Collection<SessionRow>> {
  const database = await db()
  const col = database.collection<SessionRow>('sessions')
  await Promise.all([
    col.createIndex({ tokenHash: 1 }, { unique: true }),
    // MongoDB deletes expired sessions on its own — no cleanup job to forget.
    col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ])
  return col
}

/**
 * Should the cookie be marked Secure?
 *
 * Keyed to the actual request protocol, NOT to NODE_ENV. `npm start` serves a
 * production build over plain http on localhost, and Chrome will happily SET a
 * Secure cookie there and send it on navigations — but it will not send it on
 * a fetch. Server Actions dispatch via fetch, so every admin action arrived
 * with no session and silently bounced to the login page while ordinary page
 * loads worked perfectly. That is a miserable thing to debug.
 *
 * Behind a proxy (Cloudflare, Vercel, nginx) the original scheme arrives in
 * `x-forwarded-proto`. Anywhere that is not localhost we still insist on
 * Secure in production, so a misconfigured proxy cannot quietly downgrade a
 * real session cookie to plaintext.
 */
async function isHttps(): Promise<boolean> {
  const h = await headers()
  const proto = h.get('x-forwarded-proto')?.split(',')[0]?.trim()
  if (proto) return proto === 'https'

  const host = h.get('host') ?? ''
  const local = host.startsWith('localhost') || host.startsWith('127.0.0.1') || host.startsWith('[::1]')
  return !local && process.env.NODE_ENV === 'production'
}

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

export async function createSession(email: string): Promise<void> {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + TTL_DAYS * 86_400_000)

  const col = await sessions()
  await col.insertOne({ tokenHash: hashToken(token), email, createdAt: new Date(), expiresAt })

  const jar = await cookies()
  jar.set(COOKIE, token, {
    httpOnly: true, // never readable from JavaScript, so XSS cannot steal it
    sameSite: 'lax', // survives a normal link click, blocks cross-site POSTs
    secure: await isHttps(),
    path: '/',
    expires: expiresAt,
  })
}

export async function destroySession(): Promise<void> {
  const jar = await cookies()
  const token = jar.get(COOKIE)?.value
  if (token) {
    const col = await sessions()
    await col.deleteOne({ tokenHash: hashToken(token) })
  }
  jar.delete(COOKIE)
}

/**
 * The signed-in admin, or null.
 *
 * `cache()` de-duplicates this for the duration of one request, so a layout
 * and three server components asking independently cost one database round
 * trip rather than four.
 *
 * This is the Data Access Layer the Next auth guide asks for: the real check,
 * hitting the database. Everything that matters calls this — never a cookie
 * read on its own, which only proves a cookie exists.
 */
export const getCurrentAdmin = cache(async (): Promise<AdminProfile | null> => {
  const jar = await cookies()
  const token = jar.get(COOKIE)?.value
  if (!token) return null

  const col = await sessions()
  const row = await col.findOne({ tokenHash: hashToken(token) })
  // Belt and braces: the TTL index sweeps expired rows, but not instantly.
  if (!row || row.expiresAt <= new Date()) return null

  return findAdmin(row.email)
})

/** Throws unless signed in. For use inside Server Functions. */
export async function requireAdmin(): Promise<AdminProfile> {
  const admin = await getCurrentAdmin()
  if (!admin) throw new Error('Not authorised')
  return admin
}

/** Throws unless signed in with one of these roles. */
export async function requireRole(...roles: Role[]): Promise<AdminProfile> {
  const admin = await requireAdmin()
  if (!roles.includes(admin.role)) throw new Error('Not authorised')
  return admin
}
