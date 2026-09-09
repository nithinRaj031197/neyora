/**
 * Spins up a real Postgres (PGlite — Postgres compiled to WASM) and applies
 * every migration in `supabase/migrations`.
 *
 * This is what makes it possible to test Row Level Security for real rather
 * than by reading the SQL: policies are evaluated by Postgres itself, against
 * an actual `anon` role and an actual JWT claim. A static check can tell you a
 * policy exists; only this can tell you it works.
 *
 * PGlite is plain Postgres, so the Supabase-provided pieces the migrations
 * depend on — the `auth` and `storage` schemas, `auth.uid()`, and the three
 * roles — are created here first, mirroring what a Supabase project provides.
 */
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm'
import { unaccent } from '@electric-sql/pglite/contrib/unaccent'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const MIGRATIONS_DIR = join(import.meta.dirname, '..', '..', 'supabase', 'migrations')

/** The Supabase surface the migrations assume already exists. */
const SUPABASE_PRELUDE = `
  create schema if not exists auth;
  create schema if not exists storage;

  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text unique
  );

  -- Supabase derives these from the request's JWT. Here they read the same
  -- session settings, so a test can "become" a given user.
  create or replace function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
  $$;
  create or replace function auth.role() returns text language sql stable as $$
    select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon');
  $$;

  create table storage.buckets (
    id text primary key,
    name text not null,
    public boolean default false,
    file_size_limit bigint,
    allowed_mime_types text[]
  );
  create table storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text references storage.buckets (id),
    name text
  );
  alter table storage.objects enable row level security;

  do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
  do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
  do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;

  grant usage on schema auth, storage to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
`

/** The subset of the PGlite API a scoped callback needs. */
export type Scoped = Pick<PGlite, 'query' | 'exec'>

export interface TestDatabase {
  /** Superuser handle: setup, seeding and assertions that bypass RLS. */
  db: PGlite
  /** Runs `fn` as the anon role — a public website visitor. */
  asAnon<T>(fn: (tx: Scoped) => Promise<T>): Promise<T>
  /** Runs `fn` as a signed-in Supabase Auth user. */
  asUser<T>(userId: string, fn: (tx: Scoped) => Promise<T>): Promise<T>
  /** Convenience: how many rows the given principal can see. */
  countAs(role: 'anon' | 'authenticated', userId: string | null, sql: string): Promise<number>
  close(): Promise<void>
}

export async function createTestDatabase(): Promise<TestDatabase> {
  const db = await PGlite.create({ extensions: { pgcrypto, pg_trgm, unaccent } })

  await db.exec(SUPABASE_PRELUDE)

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort()

  for (const file of files) {
    try {
      await db.exec(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'))
    } catch (error) {
      throw new Error(
        `Migration ${file} failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /*
   * Every scoped call runs inside an explicit transaction.
   *
   * The transaction is not incidental: `SET LOCAL ROLE` is silently a no-op
   * outside one, which would quietly run these tests as superuser — and a
   * superuser bypasses RLS, so every assertion here would pass for entirely
   * the wrong reason.
   *
   * BEGIN/COMMIT are issued by hand rather than through `db.transaction()`
   * because many of these tests *expect* a statement to be refused, and
   * explicit control makes the rollback path unambiguous on a single-
   * connection database.
   */
  async function withRole<T>(
    role: 'anon' | 'authenticated',
    userId: string | null,
    fn: (tx: Scoped) => Promise<T>,
  ): Promise<T> {
    await db.exec('begin;')
    try {
      await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId ?? ''])
      await db.query(`select set_config('request.jwt.claim.role', $1, true)`, [role])
      await db.exec(`set local role ${role};`)

      // Guard against the failure mode above: if the role did not take, the
      // test would be meaningless, so fail loudly instead.
      const current = await db.query<{ role: string }>('select current_user as role')
      if (current.rows[0]?.role !== role) {
        throw new Error(`Expected to be running as "${role}", got "${current.rows[0]?.role}"`)
      }

      const result = await fn(db)
      await db.exec('commit;')
      return result
    } catch (error) {
      // The transaction is aborted after a refused statement; unwind it so the
      // next test starts clean.
      await db.exec('rollback;').catch(() => {})
      throw error
    }
  }

  return {
    db,
    asAnon: (fn) => withRole('anon', null, fn),
    asUser: (userId, fn) => withRole('authenticated', userId, fn),
    async countAs(role, userId, sql) {
      return withRole(role, userId, async (tx) => {
        const result = await tx.query<{ n: number }>(sql)
        return Number(result.rows[0]?.n ?? 0)
      })
    },
    close: () => db.close(),
  }
}

/** Creates an auth user plus its admins row, returning the auth user id. */
export async function createAdmin(
  db: PGlite,
  email: string,
  role: 'owner' | 'admin' | 'editor',
): Promise<string> {
  const user = await db.query<{ id: string }>(
    `insert into auth.users (email) values ($1) returning id`,
    [email],
  )
  const userId = user.rows[0]!.id
  await db.query(`insert into public.admins (user_id, email, role) values ($1, $2, $3)`, [
    userId,
    email,
    role,
  ])
  return userId
}

/** Creates an auth user with NO admins row — a signed-in member of the public. */
export async function createPlainUser(db: PGlite, email: string): Promise<string> {
  const user = await db.query<{ id: string }>(
    `insert into auth.users (email) values ($1) returning id`,
    [email],
  )
  return user.rows[0]!.id
}
