import 'server-only'
import type { Collection } from 'mongodb'
import { db } from '@/lib/db/mongo'
import { hashPassword, verifyPassword } from './password'

/**
 * Admin accounts.
 *
 * Deliberately not self-service: there is no sign-up page and never will be.
 * Accounts are created from the command line (`npm run admin:create`), because
 * the only people who should have one are the two or three running the farm,
 * and a public registration route is an open door for no benefit.
 */

export const ROLES = ['owner', 'staff'] as const
export type Role = (typeof ROLES)[number]

export interface Admin {
  email: string
  name: string
  role: Role
  passwordHash: string
  createdAt: Date
  lastLoginAt?: Date
  /** Set after too many failed attempts; login is refused until it passes. */
  lockedUntil?: Date
  failedAttempts: number
}

/** What the rest of the app is allowed to see. Never the hash. */
export interface AdminProfile {
  email: string
  name: string
  role: Role
}

const MAX_FAILED = 8
const LOCK_MINUTES = 15

async function admins(): Promise<Collection<Admin>> {
  const database = await db()
  const col = database.collection<Admin>('admins')
  // Emails are the login identity, so they must be unique. Idempotent.
  await col.createIndex({ email: 1 }, { unique: true })
  return col
}

const normaliseEmail = (email: string) => email.trim().toLowerCase()

export function toProfile(admin: Admin): AdminProfile {
  return { email: admin.email, name: admin.name, role: admin.role }
}

export async function createAdmin(input: {
  email: string
  name: string
  password: string
  role?: Role
}): Promise<AdminProfile> {
  const col = await admins()
  const admin: Admin = {
    email: normaliseEmail(input.email),
    name: input.name.trim(),
    role: input.role ?? 'owner',
    passwordHash: await hashPassword(input.password),
    createdAt: new Date(),
    failedAttempts: 0,
  }
  await col.insertOne(admin)
  return toProfile(admin)
}

export async function countAdmins(): Promise<number> {
  const col = await admins()
  return col.countDocuments()
}

export type AuthResult =
  | { ok: true; admin: AdminProfile }
  | { ok: false; reason: 'invalid' | 'locked' }

/**
 * Check an email and password.
 *
 * Returns a single vague `invalid` for both "no such account" and "wrong
 * password". Distinguishing them tells an attacker which emails are real,
 * which is how you turn a password guess into a target list.
 */
export async function authenticate(email: string, password: string): Promise<AuthResult> {
  const col = await admins()
  const admin = await col.findOne({ email: normaliseEmail(email) })

  if (!admin) {
    // Hash anyway. Returning early here makes a missing account measurably
    // faster than a wrong password, which leaks exactly what we just hid.
    await verifyPassword(password, 'scrypt$17$00$00')
    return { ok: false, reason: 'invalid' }
  }

  if (admin.lockedUntil && admin.lockedUntil > new Date()) {
    return { ok: false, reason: 'locked' }
  }

  if (!(await verifyPassword(password, admin.passwordHash))) {
    const failed = (admin.failedAttempts ?? 0) + 1
    await col.updateOne(
      { email: admin.email },
      failed >= MAX_FAILED
        ? {
            $set: {
              failedAttempts: 0,
              lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000),
            },
          }
        : { $set: { failedAttempts: failed } },
    )
    return { ok: false, reason: failed >= MAX_FAILED ? 'locked' : 'invalid' }
  }

  await col.updateOne(
    { email: admin.email },
    { $set: { failedAttempts: 0, lastLoginAt: new Date() }, $unset: { lockedUntil: '' } },
  )
  return { ok: true, admin: toProfile(admin) }
}

export async function findAdmin(email: string): Promise<AdminProfile | null> {
  const col = await admins()
  const admin = await col.findOne({ email: normaliseEmail(email) })
  return admin ? toProfile(admin) : null
}
