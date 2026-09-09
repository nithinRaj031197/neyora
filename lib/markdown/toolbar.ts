/**
 * Pure text transforms behind the Markdown editor toolbar.
 *
 * Kept free of DOM and React so each one is directly unit-testable — the
 * fiddly parts of a Markdown editor are exactly here (does bold toggle off?
 * does a list respect an existing prefix?) and they deserve tests, not
 * manual clicking.
 */

export interface Selection {
  value: string
  start: number
  end: number
}

export interface EditResult {
  value: string
  start: number
  end: number
}

/**
 * Wraps the selection in `marker`, or unwraps it when already wrapped.
 * With nothing selected, inserts the markers and places the caret between.
 */
export function toggleWrap(sel: Selection, marker: string, placeholder = ''): EditResult {
  const { value, start, end } = sel
  const selected = value.slice(start, end)

  const before = value.slice(Math.max(0, start - marker.length), start)
  const after = value.slice(end, end + marker.length)

  // Already wrapped from outside the selection -> unwrap.
  if (before === marker && after === marker) {
    return {
      value: value.slice(0, start - marker.length) + selected + value.slice(end + marker.length),
      start: start - marker.length,
      end: end - marker.length,
    }
  }

  // Wrapped inside the selection -> unwrap.
  if (
    selected.length >= marker.length * 2 &&
    selected.startsWith(marker) &&
    selected.endsWith(marker)
  ) {
    const inner = selected.slice(marker.length, selected.length - marker.length)
    return { value: value.slice(0, start) + inner + value.slice(end), start, end: start + inner.length }
  }

  const text = selected || placeholder
  const wrapped = `${marker}${text}${marker}`
  return {
    value: value.slice(0, start) + wrapped + value.slice(end),
    start: start + marker.length,
    end: start + marker.length + text.length,
  }
}

/** Start of the line containing `index`. */
function lineStart(value: string, index: number): number {
  return value.lastIndexOf('\n', Math.max(0, index - 1)) + 1
}

/** End of the line containing `index` (exclusive of the newline). */
function lineEnd(value: string, index: number): number {
  const next = value.indexOf('\n', index)
  return next === -1 ? value.length : next
}

/**
 * Applies a heading level to every selected line, replacing any existing one.
 * Re-applying the same level removes it, so the button toggles.
 */
export function toggleHeading(sel: Selection, level: 1 | 2 | 3 | 4): EditResult {
  const { value } = sel
  const from = lineStart(value, sel.start)
  const to = lineEnd(value, sel.end)
  const block = value.slice(from, to)
  const prefix = `${'#'.repeat(level)} `

  const lines = block.split('\n')
  const allMatch = lines.every((line) => line.startsWith(prefix))

  const next = lines
    .map((line) => {
      const stripped = line.replace(/^#{1,6}\s+/, '')
      return allMatch ? stripped : `${prefix}${stripped}`
    })
    .join('\n')

  return { value: value.slice(0, from) + next + value.slice(to), start: from, end: from + next.length }
}

/** Bulleted or numbered list across the selected lines. Toggles off. */
export function toggleList(sel: Selection, kind: 'bullet' | 'ordered'): EditResult {
  const { value } = sel
  const from = lineStart(value, sel.start)
  const to = lineEnd(value, sel.end)
  const block = value.slice(from, to) || ''
  const lines = block.split('\n')

  const bulletRe = /^[-*+]\s+/
  const orderedRe = /^\d+\.\s+/
  const targetRe = kind === 'bullet' ? bulletRe : orderedRe
  const allMatch = block.length > 0 && lines.every((line) => targetRe.test(line))

  const next = lines
    .map((line, index) => {
      const stripped = line.replace(bulletRe, '').replace(orderedRe, '')
      if (allMatch) return stripped
      return kind === 'bullet' ? `- ${stripped}` : `${index + 1}. ${stripped}`
    })
    .join('\n')

  return { value: value.slice(0, from) + next + value.slice(to), start: from, end: from + next.length }
}

/** Blockquote across the selected lines. Toggles off. */
export function toggleQuote(sel: Selection): EditResult {
  const { value } = sel
  const from = lineStart(value, sel.start)
  const to = lineEnd(value, sel.end)
  const block = value.slice(from, to)
  const lines = block.split('\n')
  const allMatch = block.length > 0 && lines.every((line) => line.startsWith('> '))

  const next = lines
    .map((line) => (allMatch ? line.replace(/^>\s?/, '') : `> ${line}`))
    .join('\n')

  return { value: value.slice(0, from) + next + value.slice(to), start: from, end: from + next.length }
}

/** Inserts a link, using the selection as the label when there is one. */
export function insertLink(sel: Selection, url = 'https://'): EditResult {
  const { value, start, end } = sel
  const label = value.slice(start, end) || 'link text'
  const snippet = `[${label}](${url})`
  return {
    value: value.slice(0, start) + snippet + value.slice(end),
    // Select the URL, because that is what the author needs to replace next.
    start: start + label.length + 3,
    end: start + label.length + 3 + url.length,
  }
}

export function insertImage(sel: Selection, url: string, alt = 'Describe this image'): EditResult {
  const { value, start, end } = sel
  const snippet = `![${alt}](${url})`
  return {
    value: value.slice(0, start) + snippet + value.slice(end),
    start: start + 2,
    end: start + 2 + alt.length,
  }
}

/**
 * Inserts a block on a fresh line *after* the caret's line.
 *
 * Anchoring to the end of the current line rather than its start matters: with
 * the caret at the end of a paragraph, inserting at the line start would push
 * the table or rule above the text the author just wrote.
 */
export function insertBlock(sel: Selection, block: string): EditResult {
  const { value, start } = sel
  const to = lineEnd(value, start)
  const currentLine = value.slice(lineStart(value, start), to)
  // A blank line keeps the block a separate Markdown element.
  const lead = currentLine.trim() === '' ? '' : '\n\n'
  const snippet = `${lead}${block}\n`
  const caret = to + snippet.length
  return {
    value: value.slice(0, to) + snippet + value.slice(to),
    start: caret,
    end: caret,
  }
}

export const TABLE_SNIPPET = `| Column | Column |
| --- | --- |
| Value | Value |`

export const HR_SNIPPET = '---'

export function insertCodeBlock(sel: Selection): EditResult {
  const { value, start, end } = sel
  const selected = value.slice(start, end)
  const snippet = `\n\`\`\`\n${selected || 'code'}\n\`\`\`\n`
  return {
    value: value.slice(0, start) + snippet + value.slice(end),
    start: start + 5,
    end: start + 5 + (selected || 'code').length,
  }
}
