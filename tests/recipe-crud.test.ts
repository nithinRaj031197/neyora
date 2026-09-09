import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Recipe CRUD, exercised against a fake Supabase client.
 *
 * The point is to verify the parts of the action that are easy to get wrong
 * and invisible in a type check: that authorisation is enforced before any
 * write, that a blank number field becomes 0 rather than null on a NOT NULL
 * column, that the generated `total_time_minutes` column is never written, and
 * that tags are replaced rather than duplicated.
 */

// ---------------------------------------------------------------------------
// Fake Supabase
// ---------------------------------------------------------------------------

interface Call {
  table: string
  op: 'insert' | 'update' | 'delete' | 'select'
  payload?: Record<string, unknown> | Record<string, unknown>[]
  filters: [string, string][]
}

const calls: Call[] = []
let failNext: { code?: string; message: string; details?: string } | null = null

function builder(table: string, op: Call['op'], payload?: Call['payload']) {
  const call: Call = { table, op, payload, filters: [] }
  calls.push(call)

  const chain = {
    eq(column: string, value: string) {
      call.filters.push([column, value])
      return chain
    },
    is(column: string, value: unknown) {
      call.filters.push([column, String(value)])
      return chain
    },
    select() {
      return chain
    },
    order() {
      return chain
    },
    single() {
      if (failNext) {
        const error = failNext
        failNext = null
        return Promise.resolve({ data: null, error })
      }
      return Promise.resolve({
        data: { id: 'recipe-1', slug: String((payload as Record<string, unknown>)?.slug ?? 'slug') },
        error: null,
      })
    },
    maybeSingle() {
      return Promise.resolve({ data: null, error: null })
    },
    then(resolve: (value: { data: unknown; error: unknown }) => unknown) {
      if (failNext) {
        const error = failNext
        failNext = null
        return Promise.resolve({ data: null, error }).then(resolve)
      }
      return Promise.resolve({ data: [], error: null }).then(resolve)
    },
  }
  return chain
}

const fakeClient = {
  from(table: string) {
    return {
      insert: (payload: Call['payload']) => builder(table, 'insert', payload),
      update: (payload: Call['payload']) => builder(table, 'update', payload),
      delete: () => builder(table, 'delete'),
      select: () => builder(table, 'select'),
    }
  },
}

let authorized: { ok: true; session: { admin: { id: string; role: string } } } | { ok: false; error: string } = {
  ok: true,
  session: { admin: { id: 'admin-1', role: 'owner' } },
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => Promise.resolve(fakeClient),
  createReadOnlyClient: () => fakeClient,
}))

vi.mock('@/lib/auth/session', () => ({
  authorizeAction: () => Promise.resolve(authorized),
}))

// redirect() throws in Next; here it records and throws a recognisable error.
const redirects: string[] = []
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    redirects.push(url)
    throw new Error(`NEXT_REDIRECT:${url}`)
  },
}))

vi.mock('next/cache', () => ({
  revalidatePath: () => {},
}))

const { saveRecipe, setRecipeStatus, deleteRecipe, toggleRecipeFeatured } = await import(
  '@/lib/actions/recipes'
)
const { IDLE } = await import('@/lib/actions/state')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function recipeForm(overrides: Record<string, string> = {}): FormData {
  const data = new FormData()
  const fields: Record<string, string> = {
    title: 'Garlic Butter Oyster Mushrooms',
    slug: 'garlic-butter-oyster-mushrooms',
    body: '## Method',
    difficulty: 'easy',
    recommended_pack_size: '200g',
    status: 'published',
    scheduled_at: '',
    ingredients: JSON.stringify([{ qty: 200, unit: 'g', item: 'mushrooms', scalable: true }]),
    steps: JSON.stringify([{ body: 'Heat the pan.' }]),
    nutrition: JSON.stringify({ basis: '', per: [], note: '' }),
    equipment: JSON.stringify([]),
    ...overrides,
  }
  for (const [key, value] of Object.entries(fields)) {
    if (value !== '__omit__') data.append(key, value)
  }
  return data
}

async function run(action: (s: typeof IDLE, f: FormData) => Promise<typeof IDLE>, form: FormData) {
  try {
    return await action(IDLE, form)
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('NEXT_REDIRECT:')) {
      return { status: 'success' as const, message: error.message }
    }
    throw error
  }
}

beforeEach(() => {
  calls.length = 0
  redirects.length = 0
  failNext = null
  authorized = { ok: true, session: { admin: { id: 'admin-1', role: 'owner' } } }
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('saveRecipe — authorisation', () => {
  it('refuses and writes nothing when the caller is not an admin', async () => {
    authorized = { ok: false, error: 'You are not signed in. Please sign in again.' }

    const state = await run(saveRecipe, recipeForm())

    expect(state.status).toBe('error')
    expect(state.message).toContain('not signed in')
    // The critical assertion: no database call was attempted at all.
    expect(calls).toHaveLength(0)
  })
})

describe('saveRecipe — create', () => {
  it('inserts and redirects to the edit screen', async () => {
    await run(saveRecipe, recipeForm())

    const insert = calls.find((c) => c.table === 'recipes' && c.op === 'insert')
    expect(insert).toBeDefined()
    expect(redirects[0]).toBe('/admin/recipes/recipe-1?created=1')
  })

  it('stamps created_by and updated_by from the session, never the form', async () => {
    await run(saveRecipe, recipeForm({ created_by: 'someone-else' }))

    const insert = calls.find((c) => c.table === 'recipes' && c.op === 'insert')
    const payload = insert?.payload as Record<string, unknown>
    expect(payload.created_by).toBe('admin-1')
    expect(payload.updated_by).toBe('admin-1')
  })

  // total_time_minutes is a generated column; Postgres rejects a write to it.
  it('never writes the generated total_time_minutes column', async () => {
    await run(saveRecipe, recipeForm({ prep_time_minutes: '5', cook_time_minutes: '10' }))

    const insert = calls.find((c) => c.table === 'recipes' && c.op === 'insert')
    expect(insert?.payload).not.toHaveProperty('total_time_minutes')
  })

  // sort_order is NOT NULL with a default. An untouched number input sends
  // nothing, which must become 0 rather than null.
  it('coerces a blank sort order to 0, not null', async () => {
    await run(saveRecipe, recipeForm({ sort_order: '__omit__' }))

    const insert = calls.find((c) => c.table === 'recipes' && c.op === 'insert')
    expect((insert?.payload as Record<string, unknown>).sort_order).toBe(0)
  })

  it('derives the slug from the title when the field is empty', async () => {
    await run(saveRecipe, recipeForm({ slug: '' }))

    const insert = calls.find((c) => c.table === 'recipes' && c.op === 'insert')
    expect((insert?.payload as Record<string, unknown>).slug).toBe(
      'garlic-butter-oyster-mushrooms',
    )
  })

  it('stores the structured ingredients as parsed objects, not a JSON string', async () => {
    await run(saveRecipe, recipeForm())

    const insert = calls.find((c) => c.table === 'recipes' && c.op === 'insert')
    const payload = insert?.payload as Record<string, unknown>
    expect(Array.isArray(payload.ingredients)).toBe(true)
    expect((payload.ingredients as { item: string }[])[0]?.item).toBe('mushrooms')
  })

  it('does not send tag_ids to the recipes table', async () => {
    const form = recipeForm()
    form.append('tag_ids', 'tag-1')
    await run(saveRecipe, form)

    const insert = calls.find((c) => c.table === 'recipes' && c.op === 'insert')
    expect(insert?.payload).not.toHaveProperty('tag_ids')
  })
})

describe('saveRecipe — validation', () => {
  it('rejects an empty title before touching the database', async () => {
    const state = await run(saveRecipe, recipeForm({ title: '' }))

    expect(state.status).toBe('error')
    expect(calls).toHaveLength(0)
  })

  it('rejects an invalid slug', async () => {
    const state = await run(saveRecipe, recipeForm({ slug: 'Not A Slug' }))

    expect(state.status).toBe('error')
    expect(calls).toHaveLength(0)
  })

  it('rejects a scheduled status with no date', async () => {
    const state = await run(saveRecipe, recipeForm({ status: 'scheduled', scheduled_at: '' }))

    expect(state.status).toBe('error')
    expect(calls).toHaveLength(0)
  })
})

describe('saveRecipe — update', () => {
  it('updates rather than inserts when an id is present, and does not redirect', async () => {
    const form = recipeForm()
    form.append('id', 'recipe-1')

    const state = await run(saveRecipe, form)

    expect(calls.some((c) => c.table === 'recipes' && c.op === 'update')).toBe(true)
    expect(calls.some((c) => c.table === 'recipes' && c.op === 'insert')).toBe(false)
    expect(redirects).toHaveLength(0)
    expect(state.status).toBe('success')
  })

  // Tags live in a join table, so they are cleared and re-inserted. Without
  // the delete, editing a recipe would accumulate duplicate tag rows.
  it('replaces tags rather than appending to them', async () => {
    const form = recipeForm()
    form.append('id', 'recipe-1')
    form.append('tag_ids', 'tag-1')
    form.append('tag_ids', 'tag-2')

    await run(saveRecipe, form)

    const deletion = calls.find((c) => c.table === 'recipe_tag_map' && c.op === 'delete')
    expect(deletion).toBeDefined()
    expect(deletion?.filters).toContainEqual(['recipe_id', 'recipe-1'])

    const insert = calls.find((c) => c.table === 'recipe_tag_map' && c.op === 'insert')
    expect(insert?.payload).toEqual([
      { recipe_id: 'recipe-1', tag_id: 'tag-1' },
      { recipe_id: 'recipe-1', tag_id: 'tag-2' },
    ])
  })

  it('clears tags when none are selected', async () => {
    const form = recipeForm()
    form.append('id', 'recipe-1')

    await run(saveRecipe, form)

    expect(calls.some((c) => c.table === 'recipe_tag_map' && c.op === 'delete')).toBe(true)
    expect(calls.some((c) => c.table === 'recipe_tag_map' && c.op === 'insert')).toBe(false)
  })

  it('reports a duplicate slug against the slug field', async () => {
    failNext = {
      code: '23505',
      message: 'duplicate key value violates unique constraint "recipes_slug_key"',
      details: 'Key (slug)=(x) already exists.',
    }

    const state = await run(saveRecipe, recipeForm())

    expect(state.status).toBe('error')
    expect(state.errors?.slug).toBeTruthy()
  })

  it('confirms the outcome differently for draft, published and scheduled', async () => {
    const form = recipeForm({ status: 'draft' })
    form.append('id', 'recipe-1')
    const draft = await run(saveRecipe, form)
    expect(draft.message).toContain('Draft saved')

    const form2 = recipeForm({ status: 'published' })
    form2.append('id', 'recipe-1')
    const published = await run(saveRecipe, form2)
    expect(published.message).toContain('published')
  })
})

describe('setRecipeStatus', () => {
  it('publishes and unpublishes', async () => {
    const form = new FormData()
    form.append('id', 'recipe-1')
    form.append('status', 'published')

    await setRecipeStatus(form)

    const update = calls.find((c) => c.table === 'recipes' && c.op === 'update')
    expect((update?.payload as Record<string, unknown>).status).toBe('published')
    expect((update?.payload as Record<string, unknown>).updated_by).toBe('admin-1')
  })

  // Only the two states a list row can toggle between. 'scheduled' needs a
  // date, so it cannot be set from a single button.
  it('refuses an unsupported status', async () => {
    const form = new FormData()
    form.append('id', 'recipe-1')
    form.append('status', 'scheduled')

    await expect(setRecipeStatus(form)).rejects.toThrow(/Unsupported status/)
    expect(calls).toHaveLength(0)
  })

  it('refuses when not authorised', async () => {
    authorized = { ok: false, error: 'nope' }
    const form = new FormData()
    form.append('id', 'recipe-1')
    form.append('status', 'published')

    await expect(setRecipeStatus(form)).rejects.toThrow('nope')
    expect(calls).toHaveLength(0)
  })
})

describe('toggleRecipeFeatured', () => {
  it('writes the boolean the form asked for', async () => {
    const form = new FormData()
    form.append('id', 'recipe-1')
    form.append('featured', 'true')

    await toggleRecipeFeatured(form)

    expect((calls[0]?.payload as Record<string, unknown>).featured).toBe(true)
  })

  it('treats anything other than "true" as false', async () => {
    const form = new FormData()
    form.append('id', 'recipe-1')
    form.append('featured', 'false')

    await toggleRecipeFeatured(form)

    expect((calls[0]?.payload as Record<string, unknown>).featured).toBe(false)
  })
})

describe('deleteRecipe', () => {
  // Deletes are soft throughout the CMS: the row is retained, so a mistake is
  // recoverable with a single SQL update.
  it('soft-deletes by stamping deleted_at and unpublishing', async () => {
    const form = new FormData()
    form.append('id', 'recipe-1')

    await expect(deleteRecipe(form)).rejects.toThrow(/NEXT_REDIRECT/)

    const update = calls.find((c) => c.table === 'recipes' && c.op === 'update')
    const payload = update?.payload as Record<string, unknown>
    expect(payload.deleted_at).toBeTypeOf('string')
    expect(payload.status).toBe('draft')
    expect(redirects[0]).toBe('/admin/recipes?deleted=1')
  })

  it('refuses without an id', async () => {
    await expect(deleteRecipe(new FormData())).rejects.toThrow(/No recipe id/)
    expect(calls).toHaveLength(0)
  })
})
