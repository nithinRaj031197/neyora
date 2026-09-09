/**
 * Emits JSON-LD.
 *
 * `JSON.stringify` output is escaped for the one sequence that could break out
 * of a <script> element (`</`), plus U+2028/U+2029 which are literal line
 * terminators in JS but legal inside a JSON string. With those handled, the
 * remaining content cannot terminate the script block early.
 *
 * `dangerouslySetInnerHTML` is unavoidable here — React would HTML-escape the
 * quotes in a text child and produce invalid JSON — so the escaping above is
 * what makes it safe. This is the only place in the codebase that uses it.
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const json = JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
  )
}
