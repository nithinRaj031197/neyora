/**
 * Markdown -> plain text, for meta descriptions, excerpts and JSON-LD.
 *
 * Regex-based on purpose: it runs on every page render, must not pull an AST
 * parser into the bundle, and only ever produces text that is escaped as a
 * meta-tag attribute or JSON string value.
 */
export function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/^---[\s\S]*?---/, '')                    // front matter
    .replace(/```[\s\S]*?```/g, ' ')                   // fenced code
    .replace(/`([^`]+)`/g, '$1')                       // inline code
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')          // images -> alt text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')           // links -> label
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')                // headings
    .replace(/^\s{0,3}>\s?/gm, '')                     // blockquotes
    .replace(/^\s{0,3}(?:[-*+]|\d+\.)\s+/gm, '')       // list markers
    .replace(/^\s{0,3}(?:\*\s*){3,}$|^\s{0,3}(?:-\s*){3,}$/gm, '') // rules
    .replace(/\|/g, ' ')                               // table pipes
    .replace(/(\*\*|__)(.*?)\1/g, '$2')                // bold
    .replace(/(\*|_)(.*?)\1/g, '$2')                   // italic
    .replace(/~~(.*?)~~/g, '$1')                       // strikethrough
    .replace(/<[^>]+>/g, ' ')                          // stray html
    .replace(/\s+/g, ' ')
    .trim()
}

/** Truncates on a word boundary and adds an ellipsis. */
export function truncate(text: string, max: number): string {
  const clean = text.trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max - 1)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}

export function excerptFromMarkdown(markdown: string, max = 160): string {
  return truncate(markdownToPlainText(markdown), max)
}
