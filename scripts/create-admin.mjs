/**
 * Create an admin account.
 *
 *   npm run admin:create
 *
 * There is no sign-up page on purpose — the only people who should have an
 * account are the handful running the farm. This prompts for the details and
 * never takes the password as an argument, because a password in argv ends up
 * in your shell history.
 */
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { MongoClient } from 'mongodb'
import { randomBytes, scrypt } from 'node:crypto'

const COST = 16
// scrypt needs ~128*N*r bytes; must match lib/auth/password.ts.
const maxmem = (c) => 128 * 2 ** c * 8 * 2
const hash = (password) =>
  new Promise((resolve, reject) => {
    const salt = randomBytes(16)
    scrypt(password.normalize('NFKC'), salt, 64,
      { N: 2 ** COST, r: 8, p: 1, maxmem: maxmem(COST) },
      (err, key) => err ? reject(err)
        : resolve(`scrypt$${COST}$${salt.toString('hex')}$${key.toString('hex')}`))
  })

const uri = process.env.MONGODB_URI
if (!uri) {
  console.error('MONGODB_URI is not set. Run with:  node --env-file=.env.local scripts/create-admin.mjs')
  process.exit(1)
}

const rl = createInterface({ input: stdin, output: stdout })
const email = (await rl.question('Email: ')).trim().toLowerCase()
const name = (await rl.question('Name: ')).trim()
const roleRaw = (await rl.question('Role [owner/staff] (owner): ')).trim()
const role = roleRaw === 'staff' ? 'staff' : 'owner'

// Not echoed back, and not accepted as an argument.
stdout.write('Password (min 10 chars, will not display): ')
stdin.setRawMode?.(true)
let password = ''
for await (const chunk of stdin) {
  const s = chunk.toString()
  if (s === '\r' || s === '\n') break
  if (s === '\u0003') { stdout.write('\n'); process.exit(1) }
  if (s === '\u007f') { password = password.slice(0, -1); continue }
  password += s
}
stdin.setRawMode?.(false)
stdout.write('\n')
rl.close()

if (!email.includes('@')) { console.error('That is not an email address.'); process.exit(1) }
if (password.length < 10) { console.error('Password must be at least 10 characters.'); process.exit(1) }

const client = new MongoClient(uri)
await client.connect()
const db = client.db(process.env.MONGODB_DB || 'neyora')
const admins = db.collection('admins')
await admins.createIndex({ email: 1 }, { unique: true })

if (await admins.findOne({ email })) {
  console.error(`\n${email} already has an account.`)
  await client.close()
  process.exit(1)
}

await admins.insertOne({
  email, name, role,
  passwordHash: await hash(password),
  createdAt: new Date(),
  failedAttempts: 0,
})
console.log(`\n✅ Created ${role} account for ${email}`)
console.log('   Sign in at http://localhost:3000/admin/login')
await client.close()
