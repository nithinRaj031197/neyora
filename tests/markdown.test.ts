import { describe, expect, it } from 'vitest'
import {
  HR_SNIPPET,
  TABLE_SNIPPET,
  insertBlock,
  insertCodeBlock,
  insertImage,
  insertLink,
  toggleHeading,
  toggleList,
  toggleQuote,
  toggleWrap,
} from '@/lib/markdown/toolbar'
import { excerptFromMarkdown, markdownToPlainText, truncate } from '@/lib/markdown/plain'
import {
  inlineMarkdownSanitizeSchema,
  markdownSanitizeSchema,
} from '@/lib/markdown/sanitize'

/** Helper: a selection over `value` marked with | … | in the fixture. */
function sel(value: string, start: number, end = start) {
  return { value, start, end }
}

describe('toggleWrap', () => {
  it('wraps the selection', () => {
    const result = toggleWrap(sel('hello world', 0, 5), '**')
    expect(result.value).toBe('**hello** world')
    expect(result.value.slice(result.start, result.end)).toBe('hello')
  })

  it('unwraps when the markers are already outside the selection', () => {
    const result = toggleWrap(sel('**hello** world', 2, 7), '**')
    expect(result.value).toBe('hello world')
    expect(result.value.slice(result.start, result.end)).toBe('hello')
  })

  it('unwraps when the markers are inside the selection', () => {
    const result = toggleWrap(sel('**hello** world', 0, 9), '**')
    expect(result.value).toBe('hello world')
  })

  it('inserts a placeholder when nothing is selected, and selects it', () => {
    const result = toggleWrap(sel('', 0), '**', 'bold text')
    expect(result.value).toBe('**bold text**')
    expect(result.value.slice(result.start, result.end)).toBe('bold text')
  })

  it('handles single-character markers for italics', () => {
    expect(toggleWrap(sel('word', 0, 4), '_').value).toBe('_word_')
  })
})

describe('toggleHeading', () => {
  it('adds a heading prefix', () => {
    expect(toggleHeading(sel('Ingredients', 0), 2).value).toBe('## Ingredients')
  })

  it('removes the prefix when the same level is applied again', () => {
    expect(toggleHeading(sel('## Ingredients', 3), 2).value).toBe('Ingredients')
  })

  it('replaces a different heading level rather than stacking', () => {
    expect(toggleHeading(sel('## Ingredients', 3), 3).value).toBe('### Ingredients')
  })

  it('applies across every selected line', () => {
    const result = toggleHeading(sel('One\nTwo', 0, 7), 2)
    expect(result.value).toBe('## One\n## Two')
  })

  it('only toggles off when every line already matches', () => {
    const result = toggleHeading(sel('## One\nTwo', 0, 10), 2)
    expect(result.value).toBe('## One\n## Two')
  })

  it('leaves surrounding lines untouched', () => {
    const result = toggleHeading(sel('before\nTarget\nafter', 7, 13), 2)
    expect(result.value).toBe('before\n## Target\nafter')
  })
})

describe('toggleList', () => {
  it('adds bullets across the selection', () => {
    expect(toggleList(sel('a\nb', 0, 3), 'bullet').value).toBe('- a\n- b')
  })

  it('removes bullets when every line already has one', () => {
    expect(toggleList(sel('- a\n- b', 0, 7), 'bullet').value).toBe('a\nb')
  })

  it('numbers an ordered list sequentially', () => {
    expect(toggleList(sel('a\nb\nc', 0, 5), 'ordered').value).toBe('1. a\n2. b\n3. c')
  })

  it('converts a bulleted list to an ordered one', () => {
    expect(toggleList(sel('- a\n- b', 0, 7), 'ordered').value).toBe('1. a\n2. b')
  })

  it('renumbers correctly when converting back', () => {
    expect(toggleList(sel('1. a\n2. b', 0, 9), 'bullet').value).toBe('- a\n- b')
  })
})

describe('toggleQuote', () => {
  it('adds and removes the quote prefix', () => {
    const quoted = toggleQuote(sel('Worth knowing', 0, 13))
    expect(quoted.value).toBe('> Worth knowing')
    expect(toggleQuote(sel(quoted.value, 0, quoted.value.length)).value).toBe('Worth knowing')
  })
})

describe('insertLink', () => {
  it('uses the selection as the label and selects the URL for editing', () => {
    const result = insertLink(sel('our farm', 0, 8))
    expect(result.value).toBe('[our farm](https://)')
    expect(result.value.slice(result.start, result.end)).toBe('https://')
  })

  it('inserts a placeholder label when nothing is selected', () => {
    expect(insertLink(sel('', 0)).value).toBe('[link text](https://)')
  })
})

describe('insertImage', () => {
  it('inserts markdown and selects the alt text, because that is what needs writing', () => {
    const result = insertImage(sel('', 0), '/images/hero.webp')
    expect(result.value).toBe('![Describe this image](/images/hero.webp)')
    expect(result.value.slice(result.start, result.end)).toBe('Describe this image')
  })
})

describe('insertBlock', () => {
  it('inserts a table snippet on its own line', () => {
    const result = insertBlock(sel('', 0), TABLE_SNIPPET)
    expect(result.value.startsWith('| Column | Column |')).toBe(true)
  })

  it('adds a leading break when mid-document', () => {
    const result = insertBlock(sel('Some text', 9), HR_SNIPPET)
    expect(result.value).toContain('\n---\n')
  })
})

describe('insertCodeBlock', () => {
  it('fences the selection and selects its contents', () => {
    const result = insertCodeBlock(sel('npm run dev', 0, 11))
    expect(result.value).toContain('```\nnpm run dev\n```')
    expect(result.value.slice(result.start, result.end)).toBe('npm run dev')
  })
})

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
