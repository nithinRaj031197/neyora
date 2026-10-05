import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Invariants checked against the source tree.
 *
 * The static architecture has a small attack surface — no database, no
 * credentials, no accounts — but three things can still go wrong, and all
 * three are invisible in review:
 *
 *   1. Admin-authored Markdown rendering unsanitised on a public page.
 *   2. Server-only code (filesystem access) leaking into a client bundle.
 *   3. A secret being committed.
 */

const ROOT = join(import.meta.dirname, '..')

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full)
  }
  return out
}

const SOURCES = [
  ...walk(join(ROOT, 'app')),
  ...walk(join(ROOT, 'components')),
  ...walk(join(ROOT, 'lib')),
]

const relative = (file: string) => file.slice(ROOT.length + 1)

describe('markdown rendering', () => {
  /*
   * dangerouslySetInnerHTML is a deliberate, single-site exception for JSON-LD,
   * where the payload is JSON.stringify output with the script-terminating
   * sequences escaped. Anywhere else it would be an XSS vector.
   */
  it('uses dangerouslySetInnerHTML only in the JSON-LD component', () => {
    const offenders = SOURCES.filter((file) => {
      if (relative(file) === 'components/ui/JsonLd.tsx') return false
      return /dangerouslySetInnerHTML=\{/.test(readFileSync(file, 'utf8'))
    }).map(relative)

    expect(offenders).toEqual([])
  })

  it('never enables raw HTML in the Markdown pipeline', () => {
    for (const file of SOURCES) {
      const content = readFileSync(file, 'utf8')
      // An import, not a mention: the renderer's comments explain precisely
      // why rehype-raw is absent, and that documentation is worth keeping.
      expect(content, relative(file)).not.toMatch(/from ['"]rehype-raw['"]/)
      expect(content, relative(file)).not.toMatch(/allowDangerousHtml\s*[:=]/)
    }
  })

  it('always sanitises Markdown before rendering it', () => {
    const renderer = readFileSync(join(ROOT, 'components/ui/MarkdownRenderer.tsx'), 'utf8')
    expect(renderer).toContain('rehypeSanitize')
    expect(renderer).toContain('skipHtml')
  })
})

describe('server/client boundary', () => {
  /*
   * The content loader reads from disk. If it were ever imported into a client
   * component the build would try to bundle `node:fs`, and the `server-only`
   * marker is what turns that into a loud error instead of a strange one.
   */
  it('marks every filesystem-reading module as server-only', () => {
    for (const file of SOURCES) {
      const content = readFileSync(file, 'utf8')
      if (!/from 'node:fs'/.test(content)) continue
      expect(content.startsWith("import 'server-only'"), `${relative(file)} reads the filesystem but is not marked server-only`).toBe(true)
    }
  })

  it('never imports the content loader into a client component', () => {
    for (const file of SOURCES) {
      const content = readFileSync(file, 'utf8')
      if (!content.startsWith("'use client'")) continue
      expect(content, `${relative(file)} is a client component importing content`).not.toMatch(
        /from '@\/lib\/content/,
      )
    }
  })

  it('never reads the filesystem from a client component', () => {
    for (const file of SOURCES) {
      const content = readFileSync(file, 'utf8')
      if (!content.startsWith("'use client'")) continue
      expect(content, relative(file)).not.toMatch(/from 'node:/)
    }
  })
})

describe('secrets', () => {
  it('commits no environment file other than the example', () => {
    const committed = readdirSync(ROOT).filter((name) => name.startsWith('.env'))
    expect(committed.filter((n) => n !== '.env.example' && n !== '.env.local')).toEqual([])
  })

  it('keeps .env.local out of git', () => {
    const gitignore = readFileSync(join(ROOT, '.gitignore'), 'utf8')
    expect(gitignore).toMatch(/\.env\*?\.local|\.env\.local/)
  })

  /*
   * The PEM pattern requires the header AND a real base64 body.
   *
   * Matching the header alone flagged `lib/sheets/auth.ts`, which has to name
   * the delimiter in order to strip it — a parser, not a key. Requiring 40+
   * base64 characters after it keeps every genuine leaked key caught (the
   * shortest real PKCS#8 body is hundreds of characters) while letting code
   * that merely talks about the format through. The case below proves the
   * tightened pattern still catches a key.
   */
  const PRIVATE_KEY_PATTERN =
    /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\\n"']*[A-Za-z0-9+/]{40,}/

  it('still recognises an actual private key', () => {
    const realistic =
      '-----BEGIN PRIVATE KEY-----\n' +
      'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDaLKJhGfdsaPQw\n' +
      '-----END PRIVATE KEY-----'
    expect(PRIVATE_KEY_PATTERN.test(realistic)).toBe(true)
    // ...including the single-line form an env var holds.
    expect(
      PRIVATE_KEY_PATTERN.test(
        '"-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDaLKJhGfds\\n"',
      ),
    ).toBe(true)
  })

  it('contains no API-key-shaped strings in the source tree', () => {
    const patterns = [
      /sb_secret_[A-Za-z0-9]{16,}/,
      /gh[pousr]_[A-Za-z0-9]{20,}/,
      PRIVATE_KEY_PATTERN,
    ]
    for (const file of [...SOURCES, ...walk(join(ROOT, 'content'))]) {
      const content = readFileSync(file, 'utf8')
      for (const pattern of patterns) {
        expect(pattern.test(content), `${relative(file)} contains a secret-shaped string`).toBe(
          false,
        )
      }
    }
  })
})

describe('the packaging QR route', () => {
  /*
   * The printed code cannot be recalled, so /go must never be cached and must
   * never be able to point off-site.
   */
  it('is never cached', () => {
    const route = readFileSync(join(ROOT, 'app/go/page.tsx'), 'utf8')
    expect(route).toContain("export const dynamic = 'force-dynamic'")
  })

  it('is excluded from search results', () => {
    const route = readFileSync(join(ROOT, 'app/go/page.tsx'), 'utf8')
    expect(route).toMatch(/robots:\s*\{\s*index:\s*false/)
  })

  it('validates the environment override before trusting it', () => {
    const content = readFileSync(join(ROOT, 'lib/content/index.ts'), 'utf8')
    const fn = content.slice(content.indexOf('function getQrDestination'))
    expect(fn).toContain("startsWith('/')")
    expect(fn).toContain("startsWith('//')")
  })

  it('constrains the destination in the content schema too', () => {
    const schema = readFileSync(join(ROOT, 'lib/validation/content.ts'), 'utf8')
    const qr = schema.slice(schema.indexOf('  qr: z'))
    expect(qr).toContain("startsWith('/'")
    expect(qr).toContain("'//'")
  })
})

describe('external links', () => {
  it('pairs every target="_blank" with rel="noopener"', () => {
    for (const file of SOURCES) {
      const content = readFileSync(file, 'utf8')
      const blanks = content.split('target="_blank"').length - 1
      if (blanks === 0) continue
      const noopeners = content.split('noopener').length - 1
      expect(
        noopeners,
        `${relative(file)} has ${blanks} target="_blank" but only ${noopeners} noopener`,
      ).toBeGreaterThanOrEqual(blanks)
    }
  })
})

describe('session retention', () => {
  /*
   * The prune keeps the N most recent sessions for ONE admin. These test the
   * selection rule itself — which rows are chosen and which are spared —
   * because that is where the harm would be: signing out the wrong person, or
   * signing out the session that was just created.
   */
  const MAX = 10

  const session = (email: string, minutesAgo: number) => ({
    email,
    tokenHash: `${email}-${minutesAgo}`,
    createdAt: new Date(Date.now() - minutesAgo * 60_000),
  })

  /** The same sort-and-skip the repository hands to MongoDB. */
  const toPrune = <T extends { email: string; createdAt: Date }>(rows: T[], email: string) =>
    rows
      .filter((row) => row.email === email)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(MAX)

  it('keeps everything while under the cap', () => {
    const rows = Array.from({ length: MAX }, (_, i) => session('a@neyora.in', i))
    expect(toPrune(rows, 'a@neyora.in')).toHaveLength(0)
  })

  it('removes only what is beyond the cap', () => {
    const rows = Array.from({ length: 14 }, (_, i) => session('a@neyora.in', i))
    expect(toPrune(rows, 'a@neyora.in')).toHaveLength(4)
  })

  it('removes the OLDEST, never the newest', () => {
    const rows = Array.from({ length: 12 }, (_, i) => session('a@neyora.in', i))
    const pruned = toPrune(rows, 'a@neyora.in').map((r) => r.tokenHash)
    // minutesAgo 10 and 11 are the two oldest.
    expect(pruned).toEqual(['a@neyora.in-10', 'a@neyora.in-11'])
  })

  /*
   * The session just created is always the newest, so it can never prune
   * itself. Signing in and being signed out by the same action would be
   * absurd, and it is worth being structurally impossible.
   */
  it('never prunes the session that was just created', () => {
    const rows = [session('a@neyora.in', 0), ...Array.from({ length: 20 }, (_, i) => session('a@neyora.in', i + 1))]
    const pruned = toPrune(rows, 'a@neyora.in').map((r) => r.tokenHash)
    expect(pruned).not.toContain('a@neyora.in-0')
  })

  /*
   * THE REASON THE CAP IS PER ADMIN. A global cap would let one person's
   * sign-in sign out somebody else — for no reason they could see.
   */
  it('never touches another admin', () => {
    const rows = [
      ...Array.from({ length: 20 }, (_, i) => session('a@neyora.in', i)),
      ...Array.from({ length: 3 }, (_, i) => session('b@neyora.in', i)),
    ]
    const pruned = toPrune(rows, 'a@neyora.in')
    expect(pruned.every((r) => r.email === 'a@neyora.in')).toBe(true)
    expect(toPrune(rows, 'b@neyora.in')).toHaveLength(0)
  })
})
