import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { hasRole } from '@/lib/auth/session'
import { formToObject, describeDbError } from '@/lib/actions/helpers'
import { fail, ok, IDLE } from '@/lib/actions/state'
import type { AdminRow } from '@/types/database'

function admin(role: AdminRow['role']): AdminRow {
  return {
    id: 'a1',
    user_id: 'u1',
    email: 'a@example.com',
    full_name: null,
    role,
    last_seen_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    deleted_at: null,
  }
}

describe('hasRole', () => {
  it('lets an owner do everything', () => {
    expect(hasRole(admin('owner'), 'editor')).toBe(true)
    expect(hasRole(admin('owner'), 'admin')).toBe(true)
    expect(hasRole(admin('owner'), 'owner')).toBe(true)
  })

  it('lets an admin manage content and settings but not claim ownership', () => {
    expect(hasRole(admin('admin'), 'editor')).toBe(true)
    expect(hasRole(admin('admin'), 'admin')).toBe(true)
    expect(hasRole(admin('admin'), 'owner')).toBe(false)
  })

  // The important negative case: an editor must not reach site settings or the
  // user list, however they arrive at the URL.
  it('restricts an editor to content', () => {
    expect(hasRole(admin('editor'), 'editor')).toBe(true)
    expect(hasRole(admin('editor'), 'admin')).toBe(false)
    expect(hasRole(admin('editor'), 'owner')).toBe(false)
  })
})

describe('formToObject', () => {
  function form(entries: [string, string][]): FormData {
    const data = new FormData()
    for (const [key, value] of entries) data.append(key, value)
    return data
  }

  it('reads plain fields', () => {
    expect(formToObject(form([['title', 'Hello']]))).toEqual({ title: 'Hello' })
  })

  it('parses declared JSON fields', () => {
    const result = formToObject(form([['ingredients', '[{"item":"salt"}]']]), {
      jsonFields: ['ingredients'],
    })
    expect(result.ingredients).toEqual([{ item: 'salt' }])
  })

  it('leaves malformed JSON as a string so Zod reports it against the field', () => {
    const result = formToObject(form([['ingredients', 'not json']]), {
      jsonFields: ['ingredients'],
    })
    expect(result.ingredients).toBe('not json')
  })

  it('collects repeated values into an array', () => {
    const result = formToObject(
      form([
        ['tag_ids', 'a'],
        ['tag_ids', 'b'],
      ]),
      { arrayFields: ['tag_ids'] },
    )
    expect(result.tag_ids).toEqual(['a', 'b'])
  })

  // A checkbox group with nothing ticked sends no field at all. Without this,
  // "no tags selected" would read as "leave tags unchanged".
  it('defaults an absent array field to an empty array', () => {
    const result = formToObject(form([['title', 'x']]), { arrayFields: ['tag_ids'] })
    expect(result.tag_ids).toEqual([])
  })

  it('defaults an absent JSON field to undefined so a schema default applies', () => {
    const result = formToObject(form([['title', 'x']]), { jsonFields: ['nutrition'] })
    expect(result.nutrition).toBeUndefined()
  })
})

describe('describeDbError', () => {
  it('turns a unique-violation on a slug into a field-level message', () => {
    const described = describeDbError({
      code: '23505',
      message: 'duplicate key value violates unique constraint "recipes_slug_key"',
      details: 'Key (slug)=(garlic-butter) already exists.',
    })
    expect(described.errors?.slug).toBeTruthy()
  })

  // A revoked admin row produces this, and "permission denied for table" is
  // not an actionable message for someone editing a recipe.
  it('explains an RLS refusal in terms the editor can act on', () => {
    const described = describeDbError({ code: '42501', message: 'permission denied' })
    expect(described.message).toContain('admin access')
  })

  it('surfaces a check-constraint message rather than swallowing it', () => {
    const described = describeDbError({
      code: '23514',
      message: 'new row violates check constraint "redirects_destination_relative"',
    })
    expect(described.message).toContain('redirects_destination_relative')
  })

  it('falls back to the raw message for an unknown code', () => {
    expect(describeDbError({ code: 'XX000', message: 'boom' }).message).toContain('boom')
  })
})

describe('action state helpers', () => {
  it('starts idle with no message', () => {
    expect(IDLE.status).toBe('idle')
    expect(IDLE.message).toBeUndefined()
  })

  it('stamps a nonce so a repeated identical result still notifies', () => {
    const first = ok('Saved')
    const second = ok('Saved')
    expect(first.nonce).toBeTypeOf('number')
    expect(second.nonce).toBeTypeOf('number')
  })

  it('carries field errors', () => {
    const state = fail('Check the form', { slug: 'Taken' })
    expect(state.status).toBe('error')
    expect(state.errors?.slug).toBe('Taken')
  })
})

describe('service-role guard', () => {
  const original = process.env.SUPABASE_SERVICE_ROLE_KEY

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    if (original === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY
    else process.env.SUPABASE_SERVICE_ROLE_KEY = original
  })

  it('reports the key as absent when it is not set', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    const { hasServiceRole } = await import('@/lib/supabase/admin')
    expect(hasServiceRole()).toBe(false)
  })

  it('reports the key as present when it is set', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'a-long-enough-service-role-key-value'
    const { hasServiceRole } = await import('@/lib/supabase/admin')
    expect(hasServiceRole()).toBe(true)
  })

  // The whole reason serverEnv() checks for `window`: a secret must never be
  // readable from code that could end up in a browser bundle.
  it('refuses to read secrets when a window object exists', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'a-long-enough-service-role-key-value'
    const { serverEnv } = await import('@/lib/env')
    const globalWithWindow = globalThis as { window?: unknown }
    const had = 'window' in globalWithWindow
    const previous = globalWithWindow.window
    globalWithWindow.window = {}
    try {
      expect(() => serverEnv()).toThrow(/browser/i)
    } finally {
      if (had) globalWithWindow.window = previous
      else delete globalWithWindow.window
    }
  })
})
