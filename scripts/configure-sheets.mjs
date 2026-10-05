#!/usr/bin/env node
/**
 * Put the Google Sheets credentials into .env.local, without copy-paste.
 *
 * The private key in a service-account JSON is a multi-line PEM, and every
 * manual route into an environment variable mangles it differently: an editor
 * collapses the newlines, a shell eats the backslashes, a dashboard adds
 * quotes. All three fail identically at the first sync, with an opaque crypto
 * error that says nothing about which one happened.
 *
 * So this reads the file Google gave you and writes the value itself.
 *
 * It NEVER prints the key — not to stdout, not to an error message. The most
 * it will say is how many characters it found.
 *
 * Usage:
 *   node scripts/configure-sheets.mjs <path-to-key.json> <spreadsheet-id>
 *
 * The path is usually in ~/Downloads and looks like
 * neyoramushroom-a1b2c3d4e5f6.json
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const [keyPath, spreadsheetId] = process.argv.slice(2)

if (!keyPath || !spreadsheetId) {
  console.error(
    'Usage: node scripts/configure-sheets.mjs <path-to-service-account.json> <spreadsheet-id>',
  )
  process.exit(1)
}

const file = resolve(keyPath.replace(/^~/, process.env.HOME ?? '~'))
if (!existsSync(file)) {
  console.error(`No file at ${file}`)
  process.exit(1)
}

let key
try {
  key = JSON.parse(readFileSync(file, 'utf8'))
} catch {
  console.error('That file is not valid JSON. Did you download the JSON key (not P12)?')
  process.exit(1)
}

if (key.type !== 'service_account' || !key.private_key || !key.client_email) {
  console.error('That does not look like a Google service-account key.')
  process.exit(1)
}

/*
 * Written back as a single line with literal \n, which is the form the app's
 * `normalisePrivateKey` expects and the only form that survives a .env file.
 */
const escaped = key.private_key.replace(/\n/g, '\\n')

const ENV = resolve(process.cwd(), '.env.local')
let env = existsSync(ENV) ? readFileSync(ENV, 'utf8') : ''

const upsert = (name, value) => {
  const line = `${name}=${value}`
  const pattern = new RegExp(`^${name}=.*$`, 'm')
  env = pattern.test(env) ? env.replace(pattern, line) : `${env.replace(/\s*$/, '')}\n${line}\n`
}

upsert('GOOGLE_SHEETS_ID', spreadsheetId)
upsert('GOOGLE_SERVICE_ACCOUNT_EMAIL', key.client_email)
upsert('GOOGLE_PRIVATE_KEY', `"${escaped}"`)
upsert('GOOGLE_SHEETS_TAB', 'Orders')

writeFileSync(ENV, env, { mode: 0o600 })

// Deliberately vague about the key: a length is enough to show it was read.
console.log('Wrote to .env.local:')
console.log(`  GOOGLE_SHEETS_ID              = ${spreadsheetId}`)
console.log(`  GOOGLE_SERVICE_ACCOUNT_EMAIL  = ${key.client_email}`)
console.log(`  GOOGLE_PRIVATE_KEY            = [${key.private_key.length} characters, hidden]`)
console.log(`  GOOGLE_SHEETS_TAB             = Orders`)
console.log('\n.env.local is gitignored. Keep the JSON in a password manager and delete the download.')
