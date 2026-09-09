import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Security invariants, checked against the migrations and the source tree.
 *
 * These are not a substitute for exercising RLS against a live database — that
 * procedure is documented in README.md under "Verifying Row Level Security".
 * What they *do* catch is the class of mistake that is easy to make and
 * invisible in review: a new table added without RLS, a broad grant to `anon`,
 * or a service-role import creeping into a client component.
 */

const ROOT = join(import.meta.dirname, '..')
const MIGRATIONS = join(ROOT, 'supabase', 'migrations')

function migration(match: string): string {
  const file = readdirSync(MIGRATIONS).find((name) => name.includes(match))
  if (!file) throw new Error(`No migration matching "${match}"`)
  return readFileSync(join(MIGRATIONS, file), 'utf8')
}

const SCHEMA = migration('schema')
const RLS = migration('rls')
const HELPERS = migration('extensions_and_types')
const TRIGGERS = migration('indexes_and_triggers')
const STORAGE = migration('storage')

/** Every table created in the schema migration. */
function declaredTables(): string[] {
  return [...SCHEMA.matchAll(/create table if not exists public\.(\w+)/g)].map((m) => m[1]!)
}

describe('schema', () => {
  it('declares every table the application queries', () => {
    const tables = declaredTables()
    for (const expected of [
      'admins',
      'media',
      'site_settings',
      'pages',
      'homepage',
      'product_categories',
      'products',
      'product_images',
      'recipe_categories',
      'recipe_tags',
      'recipes',
      'recipe_tag_map',
      'recipe_pack_variants',
      'faqs',
      'testimonials',
      'social_links',
      'redirects',
      'contact_messages',
      'analytics_events',
    ]) {
      expect(tables).toContain(expected)
    }
  })

  it('gives every soft-deletable content table a deleted_at column', () => {
    for (const table of ['pages', 'products', 'recipes', 'faqs', 'testimonials', 'media']) {
      const block = SCHEMA.slice(SCHEMA.indexOf(`create table if not exists public.${table}`))
      expect(block.slice(0, block.indexOf('\n);'))).toContain('deleted_at')
    }
  })

  // The publication trigger reads NEW.scheduled_at on each of these, so a
  // table without the column would raise at runtime, not at migration time.
  it('gives every table with the publication trigger a scheduled_at column', () => {
    // Read the exact array literal the trigger loop iterates over, so the
    // assertion tracks the migration rather than a hand-copied list.
    const loop = TRIGGERS.slice(TRIGGERS.indexOf('foreach t in array array['))
    const literal = loop.slice(loop.indexOf('['), loop.indexOf(']') + 1)
    const tables = [...literal.matchAll(/'(\w+)'/g)].map((m) => m[1]!)
    for (const table of tables) {
      const block = SCHEMA.slice(SCHEMA.indexOf(`create table if not exists public.${table}`))
      expect(
        block.slice(0, block.indexOf('\n);')),
        `${table} is missing scheduled_at but has the publication trigger`,
      ).toContain('scheduled_at')
    }
  })

  it('constrains QR destinations to same-origin paths in the database itself', () => {
    expect(SCHEMA).toContain('redirects_destination_relative')
    expect(SCHEMA).toMatch(/destination like '\/%'/)
  })

  it('restricts redirect status codes to the four that make sense', () => {
    expect(SCHEMA).toMatch(/http_status in \(301, 302, 307, 308\)/)
  })

  it('stores only a hash of a submitter IP, never the address', () => {
    const block = SCHEMA.slice(SCHEMA.indexOf('create table if not exists public.contact_messages'))
    expect(block).toContain('ip_hash')
    expect(block).not.toMatch(/\bip_address\b/)
  })
})

describe('authorisation helpers', () => {
  it('pins search_path on every SECURITY DEFINER function', () => {
    // is_admin / is_admin_manager live in the RLS migration, because a
    // LANGUAGE SQL body referencing public.admins cannot be created before
    // that table exists.
    const sources = [HELPERS, TRIGGERS, RLS, migration('demo_flag')]

    // Match each complete definition (header through closing $$;) so a
    // neighbouring function's modifiers cannot bleed into the check.
    const definers = sources
      .flatMap((source) => [...source.matchAll(/create or replace function[\s\S]*?\$\$;/gi)])
      .map((match) => match[0])
      .filter((definition) => /security definer/i.test(definition))

    expect(definers.length).toBeGreaterThanOrEqual(5)

    for (const definition of definers) {
      // Without a pinned search_path, a SECURITY DEFINER function can be
      // hijacked by a shadowing object in a caller-controlled schema.
      const name = definition.match(/function (public\.\w+)/)?.[1] ?? 'unknown'
      expect(definition, `${name} does not pin its search_path`).toMatch(
        /set search_path = public, pg_catalog/,
      )
    }
  })

  it('defines is_admin against the admins table, excluding soft-deleted rows', () => {
    const fn = RLS.slice(RLS.indexOf('function public.is_admin()'))
    expect(fn).toContain('a.user_id = auth.uid()')
    expect(fn).toContain('a.deleted_at is null')
  })

  it('treats scheduled content as visible only once its time has passed', () => {
    const fn = HELPERS.slice(HELPERS.indexOf('function public.is_publicly_visible'))
    expect(fn).toContain("p_status <> 'draft'")
    expect(fn).toContain('p_published_at is not null')
    expect(fn).toContain('p_published_at <= now()')
  })

  it('protects the last owner from removal or demotion', () => {
    expect(TRIGGERS).toContain('protect_last_owner')
    expect(TRIGGERS).toMatch(/Cannot remove or demote the last owner/)
  })
})

describe('row level security', () => {
  const rlsTables = [...RLS.matchAll(/alter table public\.(\w+)\s+enable row level security/g)].map(
    (m) => m[1]!,
  )

  it('enables RLS on every table declared in the schema', () => {
    for (const table of declaredTables()) {
      expect(rlsTables, `RLS is not enabled on ${table}`).toContain(table)
    }
  })

  it('forces RLS on the tables holding personal data', () => {
    expect(RLS).toMatch(/alter table public\.contact_messages\s+force row level security/)
    expect(RLS).toMatch(/alter table public\.admins\s+force row level security/)
  })

  it('revokes the default broad grants before granting anything back', () => {
    const revokeIndex = RLS.indexOf('revoke all on all tables in schema public')
    expect(revokeIndex).toBeGreaterThan(-1)
    // Every grant must come after the revoke, or it would be undone.
    const firstGrant = RLS.indexOf('grant select')
    expect(firstGrant).toBeGreaterThan(revokeIndex)
  })

  // The contact form and analytics ingest both write via server-side code
  // holding the service role. A public INSERT policy would let anyone with the
  // anon key write rows directly, bypassing validation and rate limiting.
  it('grants anon no write access to contact_messages', () => {
    const block = RLS.slice(RLS.indexOf('-- contact_messages'))
    expect(block).not.toMatch(/grant\s+[^;]*insert[^;]*on public\.contact_messages to [^;]*anon/)
    expect(block).not.toMatch(/create policy[\s\S]{0,400}for insert to anon/)
  })

  it('grants anon no access at all to analytics_events', () => {
    const start = RLS.indexOf('-- analytics_events')
    // Bound the slice to this section; the file's trailing function grants do
    // legitimately mention anon.
    const end = RLS.indexOf('-- Function grants', start)
    expect(RLS.slice(start, end)).not.toMatch(/to anon/)
  })

  it('never grants anon insert, update or delete on any table', () => {
    const grants = [...RLS.matchAll(/grant ([^;]+) on public\.(\w+) to ([^;]+);/g)]
    for (const [, privileges, table, roles] of grants) {
      if (!/anon/.test(roles!)) continue
      expect(privileges!.trim(), `anon is granted "${privileges}" on ${table}`).toBe('select')
    }
  })

  it('gates every admin policy on is_admin() rather than mere authentication', () => {
    const policies = RLS.split(/create policy/).filter((chunk) => /_admin_all|admin_/.test(chunk))
    for (const chunk of policies) {
      const header = chunk.slice(0, chunk.indexOf(';') === -1 ? chunk.length : chunk.indexOf(';'))
      if (!/to authenticated/.test(header)) continue
      expect(header).toMatch(/is_admin(_manager)?\(\)/)
    }
  })

  it('gates public content reads through the single visibility helper', () => {
    // Generated in a loop, so one string covers all seven content tables.
    expect(RLS).toContain('public.is_publicly_visible(status, published_at, deleted_at)')
  })

  it('scopes child-table visibility to the parent row', () => {
    for (const table of ['product_images', 'recipe_tag_map', 'recipe_pack_variants']) {
      const block = RLS.slice(RLS.indexOf(`${table}_public_read`))
      expect(block.slice(0, 600)).toContain('is_publicly_visible')
    }
  })

  it('exposes only enabled social links with a URL', () => {
    const block = RLS.slice(RLS.indexOf('social_links_public_read'))
    expect(block.slice(0, 300)).toMatch(/enabled and url <> ''/)
  })
})

describe('storage policies', () => {
  it('allows public reads of the media bucket', () => {
    expect(STORAGE).toMatch(/for select\s+to anon, authenticated\s+using \(bucket_id = 'media'\)/)
  })

  it('requires is_admin() for every write path', () => {
    for (const operation of ['insert', 'update', 'delete']) {
      const block = STORAGE.slice(STORAGE.indexOf(`for ${operation}`))
      expect(block.slice(0, 300)).toContain('public.is_admin()')
    }
  })

  it('restricts uploads to image mime types and a size ceiling', () => {
    expect(STORAGE).toContain('allowed_mime_types')
    expect(STORAGE).toContain('file_size_limit')
    expect(STORAGE).not.toContain('application/javascript')
  })
})

describe('source-tree guards', () => {
  function walk(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
      const full = join(dir, entry.name)
      if (entry.isDirectory()) walk(full, out)
      else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full)
    }
    return out
  }

  const sources = [
    ...walk(join(ROOT, 'app')),
    ...walk(join(ROOT, 'components')),
    ...walk(join(ROOT, 'lib')),
  ]

  it('never imports the service-role client into a client component', () => {
    for (const file of sources) {
      const content = readFileSync(file, 'utf8')
      if (!content.startsWith("'use client'")) continue
      expect(content, `${file} is a client component importing the admin client`).not.toContain(
        '@/lib/supabase/admin',
      )
    }
  })

  it('never references the service-role key outside the admin client and env module', () => {
    const allowed = ['lib/supabase/admin.ts', 'lib/env.ts', 'lib/analytics/server.ts']
    for (const file of sources) {
      const content = readFileSync(file, 'utf8')
      // Only an actual `process.env` read counts. Admin screens legitimately
      // name the variable in a "this is not configured" message.
      if (!content.includes('process.env.SUPABASE_SERVICE_ROLE_KEY')) continue
      const relative = file.slice(ROOT.length + 1)
      expect(
        allowed.some((path) => relative === path),
        `${relative} reads process.env.SUPABASE_SERVICE_ROLE_KEY directly`,
      ).toBe(true)
    }
  })

  it('never prefixes a secret with NEXT_PUBLIC_', () => {
    for (const file of sources) {
      const content = readFileSync(file, 'utf8')
      expect(content).not.toContain('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY')
      expect(content).not.toContain('NEXT_PUBLIC_ADMIN_SETUP_TOKEN')
    }
  })

  // dangerouslySetInnerHTML is a deliberate, single-site exception for JSON-LD,
  // where the payload is JSON.stringify output with the script-terminating
  // sequences escaped. Anywhere else it would be an XSS vector.
  it('uses dangerouslySetInnerHTML only in the JSON-LD component', () => {
    const offenders = sources.filter((file) => {
      const relative = file.slice(ROOT.length + 1)
      if (relative === 'components/ui/JsonLd.tsx') return false
      // Match real JSX usage, not a comment explaining why we avoid it.
      return /dangerouslySetInnerHTML=\{/.test(readFileSync(file, 'utf8'))
    })
    expect(offenders).toEqual([])
  })

  it('never enables raw HTML in the Markdown pipeline', () => {
    for (const file of sources) {
      const content = readFileSync(file, 'utf8')
      // An import, not a mention: the renderer's comments explain precisely
      // why rehype-raw is absent, and that documentation is worth keeping.
      expect(content).not.toMatch(/from ['"]rehype-raw['"]/)
      expect(content).not.toMatch(/allowDangerousHtml\s*[:=]/)
    }
  })

  it('checks authorisation in every mutating server action module', () => {
    const actionFiles = walk(join(ROOT, 'lib', 'actions')).filter((file) =>
      readFileSync(file, 'utf8').startsWith("'use server'"),
    )
    expect(actionFiles.length).toBeGreaterThan(4)
    for (const file of actionFiles) {
      const content = readFileSync(file, 'utf8')
      const relative = file.slice(ROOT.length + 1)
      // auth.ts and contact.ts are the public entry points: they authenticate
      // and validate rather than requiring an existing admin session.
      if (relative.endsWith('auth.ts') || relative.endsWith('contact.ts')) continue
      expect(content, `${relative} has no authorizeAction() call`).toContain('authorizeAction')
    }
  })
})
