import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  createAdmin,
  createPlainUser,
  createTestDatabase,
  type TestDatabase,
} from './helpers/database'

/**
 * The migrations, run against a real Postgres, with Row Level Security
 * actually evaluated.
 *
 * The point of these tests: the anon key ships to every browser, so "a draft
 * is invisible" and "the public cannot write" must be properties of the
 * database, not of the queries we happen to write. Here they are asserted by
 * becoming the `anon` role and trying.
 */
let harness: TestDatabase

beforeAll(async () => {
  harness = await createTestDatabase()
}, 60_000)

afterAll(async () => {
  await harness?.close()
})

describe('migrations', () => {
  it('apply cleanly from an empty database', async () => {
    const tables = await harness.db.query<{ n: number }>(
      `select count(*)::int as n from information_schema.tables
        where table_schema = 'public' and table_type = 'BASE TABLE'`,
    )
    expect(Number(tables.rows[0]!.n)).toBeGreaterThanOrEqual(19)
  })

  it('enable row level security on every public table', async () => {
    const unprotected = await harness.db.query<{ relname: string }>(
      `select c.relname from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`,
    )
    expect(unprotected.rows.map((r) => r.relname)).toEqual([])
  })

  it('seed enough content that a fresh install is not an empty site', async () => {
    const counts = await harness.db.query<{
      recipes: number
      products: number
      pages: number
      faqs: number
    }>(`
      select (select count(*) from public.recipes)::int  as recipes,
             (select count(*) from public.products)::int as products,
             (select count(*) from public.pages)::int    as pages,
             (select count(*) from public.faqs)::int     as faqs
    `)
    const row = counts.rows[0]!
    expect(Number(row.recipes)).toBe(3)
    expect(Number(row.products)).toBe(1)
    expect(Number(row.pages)).toBeGreaterThanOrEqual(9)
    expect(Number(row.faqs)).toBeGreaterThanOrEqual(10)
  })

  it('flag every seeded row as demo content so it can be found and purged', async () => {
    const result = await harness.db.query<{ n: number }>(
      `select count(*)::int as n from public.recipes where not is_demo`,
    )
    expect(Number(result.rows[0]!.n)).toBe(0)
  })
})

describe('publication lifecycle', () => {
  it('computes total_time_minutes rather than trusting the form', async () => {
    const result = await harness.db.query<{ total_time_minutes: number }>(
      `select total_time_minutes from public.recipes where slug = 'garlic-butter-oyster-mushrooms'`,
    )
    expect(Number(result.rows[0]!.total_time_minutes)).toBe(15)
  })

  it('clears published_at for a draft and stamps it on publish', async () => {
    await harness.db.exec(`
      insert into public.recipes (slug, title, status) values ('lifecycle', 'Lifecycle', 'draft');
    `)

    const draft = await harness.db.query<{ empty: boolean }>(
      `select published_at is null as empty from public.recipes where slug = 'lifecycle'`,
    )
    expect(draft.rows[0]!.empty).toBe(true)

    await harness.db.exec(`update public.recipes set status = 'published' where slug = 'lifecycle'`)
    const published = await harness.db.query<{ present: boolean }>(
      `select published_at is not null as present from public.recipes where slug = 'lifecycle'`,
    )
    expect(published.rows[0]!.present).toBe(true)

    // Unpublishing must really unpublish, not leave a stale timestamp behind.
    await harness.db.exec(`update public.recipes set status = 'draft' where slug = 'lifecycle'`)
    const back = await harness.db.query<{ empty: boolean }>(
      `select published_at is null as empty from public.recipes where slug = 'lifecycle'`,
    )
    expect(back.rows[0]!.empty).toBe(true)
  })

  /*
   * Scheduling works without any cron job or background worker, which matters
   * because pg_cron is not available on the Supabase free tier. The trigger
   * mirrors scheduled_at into published_at, and visibility is a comparison
   * against now() — so a scheduled recipe goes live on its own.
   */
  it('publishes scheduled content automatically once its time passes', async () => {
    await harness.db.exec(`
      insert into public.recipes (slug, title, status, scheduled_at)
      values ('future', 'Future', 'scheduled', now() + interval '1 day');
    `)

    const future = await harness.db.query<{ visible: boolean }>(
      `select public.is_publicly_visible(status, published_at, deleted_at) as visible
         from public.recipes where slug = 'future'`,
    )
    expect(future.rows[0]!.visible).toBe(false)

    await harness.db.exec(
      `update public.recipes set scheduled_at = now() - interval '1 minute' where slug = 'future'`,
    )
    const elapsed = await harness.db.query<{ visible: boolean }>(
      `select public.is_publicly_visible(status, published_at, deleted_at) as visible
         from public.recipes where slug = 'future'`,
    )
    expect(elapsed.rows[0]!.visible).toBe(true)
  })
})

describe('row level security — the public (anon)', () => {
  it('can read the published seeded recipes', async () => {
    // Asserted by slug rather than by total count, so the result does not
    // depend on rows other tests in this file have created.
    const n = await harness.countAs(
      'anon',
      null,
      `select count(*)::int as n from public.recipes
        where slug in (
          'garlic-butter-oyster-mushrooms',
          'pepper-oyster-mushroom-fry',
          'crispy-oyster-mushroom'
        )`,
    )
    expect(n).toBe(3)
  })

  // The single most important assertion in this file.
  it('cannot see a draft recipe', async () => {
    await harness.db.exec(`
      insert into public.recipes (slug, title, status)
      values ('secret-draft', 'Secret Draft', 'draft');
    `)

    const visible = await harness.countAs(
      'anon',
      null,
      `select count(*)::int as n from public.recipes where slug = 'secret-draft'`,
    )
    expect(visible).toBe(0)
  })

  it('cannot see a scheduled recipe before its time', async () => {
    await harness.db.exec(`
      insert into public.recipes (slug, title, status, scheduled_at)
      values ('not-yet', 'Not Yet', 'scheduled', now() + interval '7 days');
    `)

    const visible = await harness.countAs(
      'anon',
      null,
      `select count(*)::int as n from public.recipes where slug = 'not-yet'`,
    )
    expect(visible).toBe(0)
  })

  it('cannot see a soft-deleted recipe', async () => {
    await harness.db.exec(`
      insert into public.recipes (slug, title, status, deleted_at)
      values ('removed', 'Removed', 'published', now());
    `)

    const visible = await harness.countAs(
      'anon',
      null,
      `select count(*)::int as n from public.recipes where slug = 'removed'`,
    )
    expect(visible).toBe(0)
  })

  it('cannot insert, update or delete a recipe', async () => {
    await expect(
      harness.asAnon((tx) =>
        tx.exec(`insert into public.recipes (slug, title) values ('hacked', 'Hacked')`),
      ),
    ).rejects.toThrow()

    await expect(
      harness.asAnon((tx) => tx.exec(`update public.recipes set title = 'Hacked'`)),
    ).rejects.toThrow()

    await expect(
      harness.asAnon((tx) => tx.exec(`delete from public.recipes`)),
    ).rejects.toThrow()
  })

  // No public INSERT policy: submissions go through a Server Action that
  // validates and rate-limits, then writes with the service role.
  it('cannot read or write contact messages', async () => {
    await harness.db.exec(`
      insert into public.contact_messages (name, email, message)
      values ('Anita', 'anita@example.com', 'A private enquiry about wholesale pricing.');
    `)

    await expect(
      harness.asAnon((tx) => tx.query(`select * from public.contact_messages`)),
    ).rejects.toThrow()

    await expect(
      harness.asAnon((tx) =>
        tx.exec(
          `insert into public.contact_messages (name, email, message) values ('x','x@y.z','spam spam')`,
        ),
      ),
    ).rejects.toThrow()
  })

  it('cannot read or write analytics events', async () => {
    await expect(
      harness.asAnon((tx) => tx.query(`select * from public.analytics_events`)),
    ).rejects.toThrow()

    await expect(
      harness.asAnon((tx) =>
        tx.exec(`insert into public.analytics_events (event_name) values ('qr_scan')`),
      ),
    ).rejects.toThrow()
  })

  it('cannot read the admins table', async () => {
    await expect(
      harness.asAnon((tx) => tx.query(`select * from public.admins`)),
    ).rejects.toThrow()
  })

  it('can read site settings and the homepage, which are site chrome', async () => {
    const settings = await harness.countAs(
      'anon',
      null,
      `select count(*)::int as n from public.site_settings`,
    )
    expect(settings).toBe(1)

    const homepage = await harness.countAs(
      'anon',
      null,
      `select count(*)::int as n from public.homepage`,
    )
    expect(homepage).toBe(1)
  })

  it('cannot change site settings', async () => {
    await expect(
      harness.asAnon((tx) =>
        tx.exec(`update public.site_settings set brand_name = 'HACKED' where id = 1`),
      ),
    ).rejects.toThrow()
  })

  it('sees only enabled social links that have a URL', async () => {
    const n = await harness.countAs(
      'anon',
      null,
      `select count(*)::int as n from public.social_links`,
    )
    expect(n).toBe(1)
  })

  it('can resolve an enabled QR redirect but cannot inflate its counter', async () => {
    const n = await harness.countAs('anon', null, `select count(*)::int as n from public.redirects`)
    expect(n).toBe(2)

    await expect(
      harness.asAnon((tx) => tx.exec(`update public.redirects set scan_count = 999999`)),
    ).rejects.toThrow()
  })

  it('cannot see a soft-deleted media row', async () => {
    await harness.db.exec(`
      insert into public.media (path, public_url, mime_type, deleted_at)
      values ('gone.webp', '/gone.webp', 'image/webp', now());
    `)

    const visible = await harness.countAs(
      'anon',
      null,
      `select count(*)::int as n from public.media where path = 'gone.webp'`,
    )
    expect(visible).toBe(0)
  })

  it('cannot see the pack variants of an unpublished recipe', async () => {
    const recipe = await harness.db.query<{ id: string }>(`
      insert into public.recipes (slug, title, status)
      values ('hidden-variants', 'Hidden Variants', 'draft')
      returning id
    `)
    await harness.db.query(
      `insert into public.recipe_pack_variants (recipe_id, pack_size, ingredients)
       values ($1, '500g', '[{"item":"secret"}]'::jsonb)`,
      [recipe.rows[0]!.id],
    )

    const visible = await harness.countAs(
      'anon',
      null,
      `select count(*)::int as n from public.recipe_pack_variants`,
    )
    // Only the seeded variant, whose recipe is published.
    expect(visible).toBe(1)
  })
})

describe('row level security — a signed-in non-admin', () => {
  let plainUserId: string

  beforeAll(async () => {
    plainUserId = await createPlainUser(harness.db, 'visitor@example.com')
  })

  /*
   * The rule that matters most: signing up to Supabase Auth grants nothing.
   * Every write policy additionally requires a row in `admins`.
   */
  it('cannot insert a recipe', async () => {
    await expect(
      harness.asUser(plainUserId, (tx) =>
        tx.exec(`insert into public.recipes (slug, title) values ('sneaky', 'Sneaky')`),
      ),
    ).rejects.toThrow()
  })

  /*
   * An UPDATE refused by RLS affects zero rows rather than raising: the policy
   * filters which rows are visible to the statement, so there is nothing to
   * update. The row is equally unmodified either way, and asserting the row
   * count is what actually demonstrates that.
   */
  it('cannot modify site settings, and the attempt silently affects no rows', async () => {
    const before = await harness.db.query<{ brand_name: string }>(
      `select brand_name from public.site_settings where id = 1`,
    )

    const result = await harness.asUser(plainUserId, (tx) =>
      tx.query(`update public.site_settings set brand_name = 'HACKED' where id = 1`),
    )
    expect(result.affectedRows).toBe(0)

    const after = await harness.db.query<{ brand_name: string }>(
      `select brand_name from public.site_settings where id = 1`,
    )
    expect(after.rows[0]!.brand_name).toBe(before.rows[0]!.brand_name)
  })

  it('cannot modify a published recipe', async () => {
    const result = await harness.asUser(plainUserId, (tx) =>
      tx.query(
        `update public.recipes set title = 'HACKED' where slug = 'garlic-butter-oyster-mushrooms'`,
      ),
    )
    expect(result.affectedRows).toBe(0)

    const after = await harness.db.query<{ title: string }>(
      `select title from public.recipes where slug = 'garlic-butter-oyster-mushrooms'`,
    )
    expect(after.rows[0]!.title).toBe('Garlic Butter Oyster Mushrooms')
  })

  it('cannot delete a published recipe', async () => {
    const result = await harness.asUser(plainUserId, (tx) =>
      tx.query(`delete from public.recipes where slug = 'garlic-butter-oyster-mushrooms'`),
    )
    expect(result.affectedRows).toBe(0)
  })

  it('still cannot see drafts', async () => {
    const n = await harness.countAs(
      'authenticated',
      plainUserId,
      `select count(*)::int as n from public.recipes where status = 'draft'`,
    )
    expect(n).toBe(0)
  })

  it('cannot read contact messages', async () => {
    const n = await harness.countAs(
      'authenticated',
      plainUserId,
      `select count(*)::int as n from public.contact_messages`,
    )
    expect(n).toBe(0)
  })

  it('cannot grant itself admin access', async () => {
    await expect(
      harness.asUser(plainUserId, (tx) =>
        tx.query(
          `insert into public.admins (user_id, email, role) values ($1, 'visitor@example.com', 'owner')`,
          [plainUserId],
        ),
      ),
    ).rejects.toThrow()
  })

  it('reports is_admin() as false for itself', async () => {
    const result = await harness.asUser(plainUserId, () =>
      harness.db.query<{ ok: boolean }>(`select public.is_admin() as ok`),
    )
    expect(result.rows[0]!.ok).toBe(false)
  })
})

describe('row level security — an editor', () => {
  let editorId: string

  beforeAll(async () => {
    editorId = await createAdmin(harness.db, 'editor@example.com', 'editor')
  })

  it('can see draft content', async () => {
    const n = await harness.countAs(
      'authenticated',
      editorId,
      `select count(*)::int as n from public.recipes where status = 'draft'`,
    )
    expect(n).toBeGreaterThan(0)
  })

  it('can create and publish a recipe', async () => {
    await harness.asUser(editorId, (tx) =>
      tx.exec(
        `insert into public.recipes (slug, title, status) values ('editor-made', 'Editor Made', 'published')`,
      ),
    )

    const visible = await harness.countAs(
      'anon',
      null,
      `select count(*)::int as n from public.recipes where slug = 'editor-made'`,
    )
    expect(visible).toBe(1)
  })

  it('can read the contact inbox', async () => {
    const n = await harness.countAs(
      'authenticated',
      editorId,
      `select count(*)::int as n from public.contact_messages`,
    )
    expect(n).toBeGreaterThan(0)
  })

  // Role separation is enforced in the application (requireRole / authorizeAction),
  // not in RLS, which grants any admin full CMS access. Asserted here so the
  // boundary is documented rather than assumed.
  it('is recognised as an admin but not as an admin manager', async () => {
    const result = await harness.asUser(editorId, () =>
      harness.db.query<{ admin: boolean; manager: boolean }>(
        `select public.is_admin() as admin, public.is_admin_manager() as manager`,
      ),
    )
    expect(result.rows[0]!.admin).toBe(true)
    expect(result.rows[0]!.manager).toBe(false)
  })

  it('cannot add another admin', async () => {
    const other = await createPlainUser(harness.db, 'wants-access@example.com')
    await expect(
      harness.asUser(editorId, (tx) =>
        tx.query(
          `insert into public.admins (user_id, email, role) values ($1, 'wants-access@example.com', 'admin')`,
          [other],
        ),
      ),
    ).rejects.toThrow()
  })
})

describe('row level security — an owner', () => {
  let ownerId: string

  beforeAll(async () => {
    ownerId = await createAdmin(harness.db, 'owner@example.com', 'owner')
  })

  it('is both an admin and an admin manager', async () => {
    const result = await harness.asUser(ownerId, () =>
      harness.db.query<{ admin: boolean; manager: boolean }>(
        `select public.is_admin() as admin, public.is_admin_manager() as manager`,
      ),
    )
    expect(result.rows[0]!.admin).toBe(true)
    expect(result.rows[0]!.manager).toBe(true)
  })

  it('can grant CMS access to someone else', async () => {
    const newcomer = await createPlainUser(harness.db, 'newcomer@example.com')
    await harness.asUser(ownerId, (tx) =>
      tx.query(
        `insert into public.admins (user_id, email, role) values ($1, 'newcomer@example.com', 'editor')`,
        [newcomer],
      ),
    )

    const result = await harness.db.query<{ n: number }>(
      `select count(*)::int as n from public.admins where email = 'newcomer@example.com'`,
    )
    expect(Number(result.rows[0]!.n)).toBe(1)
  })

  it('can change site settings', async () => {
    await harness.asUser(ownerId, (tx) =>
      tx.exec(`update public.site_settings set brand_name = 'NEYORA' where id = 1`),
    )
  })

  // Losing access to your own CMS is unrecoverable without SQL access, so the
  // database refuses it outright.
  it('cannot be demoted while it is the only owner', async () => {
    await expect(
      harness.db.exec(`update public.admins set role = 'editor' where email = 'owner@example.com'`),
    ).rejects.toThrow(/last owner/i)
  })

  it('cannot be deleted while it is the only owner', async () => {
    await expect(
      harness.db.exec(`delete from public.admins where email = 'owner@example.com'`),
    ).rejects.toThrow(/last owner/i)
  })

  it('can be demoted once a second owner exists', async () => {
    const second = await createAdmin(harness.db, 'owner2@example.com', 'owner')
    expect(second).toBeTruthy()

    await harness.db.exec(
      `update public.admins set role = 'editor' where email = 'owner@example.com'`,
    )

    const result = await harness.db.query<{ role: string }>(
      `select role from public.admins where email = 'owner@example.com'`,
    )
    expect(result.rows[0]!.role).toBe('editor')

    // Restore, so later tests are unaffected by ordering.
    await harness.db.exec(
      `update public.admins set role = 'owner' where email = 'owner@example.com'`,
    )
  })
})

describe('grants', () => {
  it('give anon no privilege beyond SELECT on any table', async () => {
    const result = await harness.db.query<{ table_name: string; privilege_type: string }>(
      `select table_name, privilege_type from information_schema.role_table_grants
        where grantee = 'anon' and table_schema = 'public' and privilege_type <> 'SELECT'`,
    )
    expect(result.rows).toEqual([])
  })

  it('give anon no SELECT on the tables holding personal data', async () => {
    const result = await harness.db.query<{ table_name: string }>(
      `select table_name from information_schema.role_table_grants
        where grantee = 'anon' and table_schema = 'public'
          and table_name in ('contact_messages', 'admins', 'analytics_events')`,
    )
    expect(result.rows).toEqual([])
  })
})

describe('constraints', () => {
  it.each([
    ['an absolute URL', 'https://evil.example.com'],
    ['a protocol-relative URL', '//evil.example.com'],
    ['a backslash-prefixed path', '/\\evil.example.com'],
  ])('reject %s as a QR destination', async (_label, destination) => {
    await expect(
      harness.db.query(`insert into public.redirects (source, destination) values ('x', $1)`, [
        destination,
      ]),
    ).rejects.toThrow()
  })

  it('accepts a legitimate same-origin destination', async () => {
    await harness.db.exec(
      `insert into public.redirects (source, destination) values ('go/test', '/recipes/garlic-butter-oyster-mushrooms')`,
    )
  })

  it('rejects a redirect status code that is not a redirect', async () => {
    await expect(
      harness.db.exec(
        `insert into public.redirects (source, destination, http_status) values ('teapot', '/x', 418)`,
      ),
    ).rejects.toThrow()
  })

  it('rejects non-array recipe ingredients', async () => {
    await expect(
      harness.db.exec(
        `insert into public.recipes (slug, title, ingredients) values ('bad', 'Bad', '{"a":1}'::jsonb)`,
      ),
    ).rejects.toThrow()
  })

  it('rejects a malformed analytics event name', async () => {
    await expect(
      harness.db.exec(`insert into public.analytics_events (event_name) values ('Bad Name!')`),
    ).rejects.toThrow()
  })

  it('keeps site_settings and homepage as true singletons', async () => {
    await expect(harness.db.exec(`insert into public.site_settings (id) values (2)`)).rejects.toThrow()
    await expect(harness.db.exec(`insert into public.homepage (id) values (2)`)).rejects.toThrow()
  })
})

describe('security definer RPCs', () => {
  it('let an anonymous scan bump the counter without any UPDATE grant', async () => {
    const before = await harness.db.query<{ scan_count: number }>(
      `select scan_count from public.redirects where source = 'go'`,
    )

    await harness.asAnon((tx) => tx.exec(`select public.register_scan('go')`))

    const after = await harness.db.query<{ scan_count: number }>(
      `select scan_count from public.redirects where source = 'go'`,
    )
    expect(Number(after.rows[0]!.scan_count)).toBe(Number(before.rows[0]!.scan_count) + 1)
  })

  it('ignore a scan of an unknown source instead of erroring', async () => {
    await harness.asAnon((tx) => tx.exec(`select public.register_scan('no-such-code')`))
  })

  it('count a view only for a published recipe', async () => {
    await harness.asAnon((tx) =>
      tx.exec(`select public.increment_recipe_view('garlic-butter-oyster-mushrooms')`),
    )
    const published = await harness.db.query<{ view_count: number }>(
      `select view_count from public.recipes where slug = 'garlic-butter-oyster-mushrooms'`,
    )
    expect(Number(published.rows[0]!.view_count)).toBeGreaterThan(0)

    await harness.asAnon((tx) => tx.exec(`select public.increment_recipe_view('secret-draft')`))
    const draft = await harness.db.query<{ view_count: number }>(
      `select view_count from public.recipes where slug = 'secret-draft'`,
    )
    expect(Number(draft.rows[0]!.view_count)).toBe(0)
  })

  it('refuse to purge demo content for a non-manager', async () => {
    const editor = await harness.db.query<{ user_id: string }>(
      `select user_id from public.admins where email = 'editor@example.com'`,
    )
    await expect(
      harness.asUser(editor.rows[0]!.user_id, (tx) =>
        tx.query(`select public.purge_demo_content()`),
      ),
    ).rejects.toThrow(/owner or admin/i)
  })
})

describe('storage', () => {
  it('creates a public media bucket with a size limit and an image allow-list', async () => {
    const result = await harness.db.query<{
      public: boolean
      file_size_limit: number
      allowed_mime_types: string[]
    }>(`select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'media'`)

    const bucket = result.rows[0]!
    expect(bucket.public).toBe(true)
    expect(Number(bucket.file_size_limit)).toBeGreaterThan(0)
    expect(bucket.allowed_mime_types).toContain('image/webp')
    expect(bucket.allowed_mime_types).not.toContain('application/javascript')
  })

  it('requires admin rights for every write path', async () => {
    const result = await harness.db.query<{ cmd: string; qual: string | null; with_check: string | null }>(
      `select cmd, qual, with_check from pg_policies
        where schemaname = 'storage' and tablename = 'objects'`,
    )

    const writes = result.rows.filter((row) => row.cmd !== 'SELECT')
    expect(writes.length).toBe(3)
    for (const policy of writes) {
      expect(`${policy.qual ?? ''}${policy.with_check ?? ''}`).toContain('is_admin')
    }
  })
})
