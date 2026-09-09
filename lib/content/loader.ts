import 'server-only'

/**
 * Reads and validates the content files.
 *
 * This is the layer a database would otherwise occupy. Files are read once per
 * process and memoised — content cannot change without a deploy, so re-reading
 * on every request would be pure waste.
 *
 * Every file is validated with Zod on load. A malformed recipe therefore fails
 * the build with a precise message naming the file and the field, rather than
 * rendering a broken page. That is the job the database's NOT NULLs and CHECK
 * constraints used to do.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { load as parseYaml } from 'js-yaml'
import type { z } from 'zod'

export const CONTENT_DIR = join(process.cwd(), 'content')

export class ContentError extends Error {
  constructor(file: string, detail: string) {
    super(`Invalid content in ${file}:\n${detail}`)
    this.name = 'ContentError'
  }
}

/**
 * Splits YAML frontmatter from a Markdown body.
 *
 * Hand-written rather than pulling in gray-matter: the delimiting is a
 * three-line rule, and the genuinely hard part — parsing YAML — is delegated
 * to js-yaml. One maintained dependency instead of a stale tree.
 */
function splitFrontmatter(raw: string): { data: unknown; body: string } {
  // Tolerate a UTF-8 BOM and CRLF line endings, both of which editors add.
  const text = raw.replace(/^﻿/, '').replace(/\r\n/g, '\n')

  if (!text.startsWith('---\n')) {
    return { data: {}, body: text.trim() }
  }

  const end = text.indexOf('\n---', 3)
  if (end === -1) {
    throw new Error('Frontmatter is opened with --- but never closed')
  }

  const frontmatter = text.slice(4, end)
  const body = text.slice(text.indexOf('\n', end + 1) + 1)

  return { data: parseYaml(frontmatter) ?? {}, body: body.trim() }
}

/** Formats a ZodError so the message names the field and says what is wrong. */
function describe(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  • ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n')
}

function readFile(relativePath: string): string {
  const full = join(CONTENT_DIR, relativePath)
  if (!existsSync(full)) {
    throw new ContentError(relativePath, '  • file not found')
  }
  return readFileSync(full, 'utf8')
}

/** Loads one Markdown file, returning validated frontmatter plus the body. */
export function loadMarkdown<S extends z.ZodType>(
  relativePath: string,
  schema: S,
): z.output<S> & { body: string } {
  let split: { data: unknown; body: string }
  try {
    split = splitFrontmatter(readFile(relativePath))
  } catch (error) {
    throw new ContentError(
      relativePath,
      `  • ${error instanceof Error ? error.message : String(error)}`,
    )
  }

  const parsed = schema.safeParse(split.data)
  if (!parsed.success) {
    throw new ContentError(relativePath, describe(parsed.error))
  }

  // The cast is safe: every schema passed here is a z.object, so its output
  // is spreadable. TypeScript cannot prove that from the generic alone.
  return { ...(parsed.data as object), body: split.body } as z.output<S> & { body: string }
}

/** Loads one YAML file. */
export function loadYaml<S extends z.ZodType>(relativePath: string, schema: S): z.output<S> {
  let data: unknown
  try {
    data = parseYaml(readFile(relativePath)) ?? {}
  } catch (error) {
    throw new ContentError(
      relativePath,
      `  • ${error instanceof Error ? error.message : String(error)}`,
    )
  }

  const parsed = schema.safeParse(data)
  if (!parsed.success) {
    throw new ContentError(relativePath, describe(parsed.error))
  }
  return parsed.data
}

/**
 * Loads every Markdown file in a directory.
 *
 * A mismatch between the filename and the `slug` field is treated as an error
 * rather than quietly preferring one: the filename is what an author edits and
 * the slug is what becomes the URL, so a drift between them means one of the
 * two is a typo and a link will break.
 */
export function loadMarkdownDir<S extends z.ZodType>(
  relativeDir: string,
  schema: S,
): (z.output<S> & { body: string })[] {
  const dir = join(CONTENT_DIR, relativeDir)
  if (!existsSync(dir)) return []

  return readdirSync(dir)
    .filter((name) => name.endsWith('.md') && !name.startsWith('.'))
    .sort()
    .map((name) => {
      const loaded = loadMarkdown<S>(join(relativeDir, name), schema)
      const expected = name.replace(/\.md$/, '')
      const actual = (loaded as { slug?: string }).slug

      if (actual && actual !== expected) {
        throw new ContentError(
          join(relativeDir, name),
          `  • slug "${actual}" does not match the filename "${expected}.md".\n` +
            '    The filename and the slug must agree, or the URL will not be what you expect.',
        )
      }
      return loaded
    })
}

/** Memoises a loader for the lifetime of the process. */
export function once<T>(fn: () => T): () => T {
  let cached: T | undefined
  let done = false
  return () => {
    if (!done) {
      cached = fn()
      done = true
    }
    return cached as T
  }
}
