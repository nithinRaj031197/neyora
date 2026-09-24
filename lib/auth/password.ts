import 'server-only'
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'

/**
 * Password hashing with scrypt, from Node's own crypto.
 *
 * No bcrypt, no argon2 — both are native addons that need compiling, and this
 * project has stayed dependency-light on purpose. scrypt is memory-hard, in
 * the standard library, and recommended by OWASP for password storage.
 *
 * Stored as `scrypt$<N>$<salt-hex>$<hash-hex>`. The cost is written into the
 * string so it can be raised later without invalidating existing passwords —
 * an old hash still verifies against its own recorded cost.
 */

const KEYLEN = 64
const SALT_BYTES = 16
/**
 * 2^16. scrypt needs about `128 * N * r` bytes, so this costs ~64MB and a
 * tenth of a second per hash — slow and memory-hungry enough to matter to an
 * attacker holding the database, cheap enough that a login is not noticeable.
 * 2^17 doubles that to 128MB per login, which is a lot to ask of a small host
 * for a panel three people use.
 */
const COST = 16

/** scrypt's own requirement, plus headroom. Getting this wrong throws
 *  ERR_CRYPTO_INVALID_SCRYPT_PARAMS rather than silently weakening anything. */
const maxmem = (cost: number) => 128 * 2 ** cost * 8 * 2

export async function hashPassword(password: string): Promise<string> {
  if (password.length < 10) {
    throw new Error('Password must be at least 10 characters')
  }
  const salt = randomBytes(SALT_BYTES)
  const hash = await scryptWithCost(password, salt, COST)
  return `scrypt$${COST}$${salt.toString('hex')}$${hash.toString('hex')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 4 || parts[0] !== 'scrypt') return false

  const cost = Number.parseInt(parts[1] ?? '', 10)
  const saltHex = parts[2]
  const hashHex = parts[3]
  if (!Number.isInteger(cost) || !saltHex || !hashHex) return false

  let expected: Buffer
  try {
    expected = Buffer.from(hashHex, 'hex')
  } catch {
    return false
  }
  if (expected.length !== KEYLEN) return false

  const actual = await scryptWithCost(password, Buffer.from(saltHex, 'hex'), cost)
  // Constant-time: a plain === leaks how much of the hash matched via timing.
  return timingSafeEqual(actual, expected)
}

function scryptWithCost(password: string, salt: Buffer, cost: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(
      password.normalize('NFKC'),
      salt,
      KEYLEN,
      // maxmem must be raised to match N, or Node refuses above the default.
      { N: 2 ** cost, r: 8, p: 1, maxmem: maxmem(cost) },
      (err, key) => (err ? reject(err) : resolve(key)),
    )
  })
}
