import { describe, expect, it } from 'vitest'
import { excerptFromMarkdown, markdownToPlainText, truncate } from '@/lib/markdown/plain'
import {
  inlineMarkdownSanitizeSchema,
  markdownSanitizeSchema,
} from '@/lib/markdown/sanitize'

describe('markdownToPlainText', () => {
  it('strips headings, emphasis and list markers', () => {
    expect(markdownToPlainText('## Method\n\n- **Heat** the _pan_')).toBe('Method Heat the pan')
  })

  it('keeps link labels and drops the URL', () => {
    expect(markdownToPlainText('See [our farm](/farm) for more')).toBe('See our farm for more')
  })

  it('keeps image alt text', () => {
    expect(markdownToPlainText('![Grey oyster mushrooms](/a.webp)')).toBe('Grey oyster mushrooms')
  })

  it('removes fenced code entirely', () => {
    expect(markdownToPlainText('Before\n\n```\nsecret\n```\n\nAfter')).toBe('Before After')
  })

  it('flattens tables into readable text', () => {
    expect(markdownToPlainText('| A | B |\n| --- | --- |\n| 1 | 2 |')).toContain('A B')
  })

  it('strips stray HTML rather than leaving tags in a meta description', () => {
    expect(markdownToPlainText('Hello <script>alert(1)</script> there')).toBe(
      'Hello alert(1) there',
    )
  })

  it('collapses whitespace', () => {
    expect(markdownToPlainText('a\n\n\n   b')).toBe('a b')
  })
})

describe('truncate', () => {
  it('leaves short text alone', () => {
    expect(truncate('short', 20)).toBe('short')
  })

  it('cuts on a word boundary and adds an ellipsis', () => {
    const result = truncate('the quick brown fox jumps over', 20)
    expect(result.endsWith('…')).toBe(true)
    expect(result.length).toBeLessThanOrEqual(20)
    expect(result).not.toContain('  ')
  })

  it('never exceeds the limit', () => {
    expect(truncate('a'.repeat(100), 30).length).toBeLessThanOrEqual(30)
  })
})

describe('excerptFromMarkdown', () => {
  it('produces a clean meta description', () => {
    const excerpt = excerptFromMarkdown('# Title\n\nA **hot** pan and [butter](/x).', 160)
    expect(excerpt).toBe('Title A hot pan and butter.')
  })
})

describe('sanitize schema', () => {
  const tags = markdownSanitizeSchema.tagNames ?? []

  it.each(['script', 'iframe', 'style', 'object', 'embed', 'form', 'link', 'meta', 'base'])(
    'does not allow <%s>',
    (tag) => {
      expect(tags).not.toContain(tag)
    },
  )

  it.each(['h2', 'p', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'blockquote', 'table', 'img', 'hr', 'code', 'pre'])(
    'allows <%s>, which the brief requires',
    (tag) => {
      expect(tags).toContain(tag)
    },
  )

  it('permits only safe URL protocols on links', () => {
    expect(markdownSanitizeSchema.protocols?.href).toEqual(['http', 'https', 'mailto', 'tel'])
  })

  it('permits only http(s) image sources, so no data: URI payloads', () => {
    expect(markdownSanitizeSchema.protocols?.src).toEqual(['http', 'https'])
  })

  it('does not allow a style attribute anywhere', () => {
    const allAttributes = Object.values(markdownSanitizeSchema.attributes ?? {}).flat()
    const names = allAttributes.map((a) => (Array.isArray(a) ? a[0] : a))
    expect(names).not.toContain('style')
  })

  it('does not allow any event handler attribute', () => {
    const allAttributes = Object.values(markdownSanitizeSchema.attributes ?? {}).flat()
    const names = allAttributes.map((a) => String(Array.isArray(a) ? a[0] : a))
    expect(names.filter((n) => n.toLowerCase().startsWith('on'))).toHaveLength(0)
  })

  it('restricts the inline schema to block-free content', () => {
    expect(inlineMarkdownSanitizeSchema.tagNames).not.toContain('img')
    expect(inlineMarkdownSanitizeSchema.tagNames).not.toContain('h1')
    expect(inlineMarkdownSanitizeSchema.tagNames).toContain('p')
  })
})
