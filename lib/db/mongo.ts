import 'server-only'
import { MongoClient, type Db } from 'mongodb'

/**
 * The MongoDB connection.
 *
 * Two rules govern this file.
 *
 * 1. NOTHING CONNECTS AT IMPORT TIME. The site is still a mostly-static build:
 *    `next build` prerenders 23 pages, and none of them should need a database
 *    to exist. If this module dialled Atlas when it loaded, a build on a
 *    machine without MONGODB_URI — CI, a fresh clone, a teammate — would fail
 *    on pages that never touch an order. So the client is created lazily on
 *    first query and the env var is read then, not now.
 *
 * 2. ONE CLIENT PER PROCESS. The driver keeps an internal connection pool;
 *    making a new MongoClient per request exhausts Atlas's connection limit
 *    surprisingly fast. In development Next reloads modules on every edit, so
 *    the client is parked on `globalThis` to survive hot reloads — without
 *    that, an afternoon of editing leaks hundreds of pooled connections.
 */

const GLOBAL_KEY = Symbol.for('neyora.mongo')

type Cache = { client: MongoClient; promise: Promise<MongoClient> } | undefined
const globalCache = globalThis as unknown as { [GLOBAL_KEY]?: Cache }

/** Read-and-validate, at call time rather than module load. See rule 1. */
function mongoUri(): string {
  const uri = process.env.MONGODB_URI?.trim()
  if (!uri) {
    throw new Error('MONGODB_URI is not set. Add it to .env.local — see docs/ORDERS.md.')
  }
  if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
    throw new Error('MONGODB_URI must start with mongodb:// or mongodb+srv://')
  }
  return uri
}

function databaseName(): string {
  return process.env.MONGODB_DB?.trim() || 'neyora'
}

function connect(): Promise<MongoClient> {
  const cached = globalCache[GLOBAL_KEY]
  if (cached) return cached.promise

  const client = new MongoClient(mongoUri(), {
    // Fail fast rather than hanging a request for 30s when Atlas is
    // unreachable — usually a changed home IP missing from Network Access.
    serverSelectionTimeoutMS: 8000,
    retryWrites: true,
    appName: 'neyora',
  })

  const promise = client.connect()
  globalCache[GLOBAL_KEY] = { client, promise }
  return promise
}

/** The application database. Connects on first use. */
export async function db(): Promise<Db> {
  const client = await connect()
  return client.db(databaseName())
}

/**
 * True when a database is configured at all.
 *
 * Lets a page degrade to "ordering is unavailable" instead of throwing, which
 * matters because the rest of the site works perfectly well without one.
 */
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.MONGODB_URI?.trim())
}
