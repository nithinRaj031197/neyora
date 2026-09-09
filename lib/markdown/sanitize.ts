/**
 * Sanitisation schema for admin-authored Markdown.
 *
 * Why an allow-list rather than DOMPurify: react-markdown never produces an
 * HTML string. It builds a React element tree, and `rehype-sanitize` prunes
 * that tree before React renders it. There is no `dangerouslySetInnerHTML`
 * anywhere in the pipeline, so there is no string for DOMPurify to clean —
 * this is the stricter arrangement of the two, and it removes a runtime
 * dependency from every page.
 *
 * `<script>`, `<iframe>`, `<style>`, event handlers, `javascript:` URLs and
 * inline styles all fail the allow-list and are dropped.
 */
import { defaultSchema } from 'rehype-sanitize'
import type { Options as SanitizeOptions } from 'rehype-sanitize'

export const markdownSanitizeSchema: SanitizeOptions = {
  ...defaultSchema,
  tagNames: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'strong', 'em', 'del', 'ins', 'mark', 'small', 'sub', 'sup',
    'a', 'br', 'hr',
    'ul', 'ol', 'li',
    'blockquote',
    'code', 'pre',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
    'img', 'figure', 'figcaption',
    'span', 'div',
    'input', // GFM task-list checkboxes only; see attribute allow-list below.
  ],
  attributes: {
    ...defaultSchema.attributes,
    a: [
      ['href'],
      ['title'],
      // Anchor targets are set by our own renderer, not by the author.
      ['className', 'md-link'],
    ],
    img: [['src'], ['alt'], ['title'], ['width'], ['height'], ['loading'], ['decoding']],
    th: [['align'], ['scope'], ['colSpan'], ['rowSpan']],
    td: [['align'], ['colSpan'], ['rowSpan']],
    code: [['className', /^language-[a-z0-9+#-]+$/i]],
    input: [
      ['type', 'checkbox'],
      ['checked'],
      ['disabled'],
    ],
    span: [['className', /^(?:md-[a-z-]+)$/]],
    div: [['className', /^(?:md-[a-z-]+)$/]],
    '*': [['id'], ['className', /^(?:md-[a-z-]+|task-list-item|contains-task-list)$/]],
  },
  // Anything not listed here is stripped, including javascript: and data:.
  protocols: {
    href: ['http', 'https', 'mailto', 'tel'],
    src: ['http', 'https'],
  },
  clobberPrefix: 'md-',
  clobber: ['name', 'id'],
}

/**
 * A stricter schema for short admin-authored fields that render Markdown but
 * should never contain a block-level layout — FAQ answers, image captions.
 */
export const inlineMarkdownSanitizeSchema: SanitizeOptions = {
  ...markdownSanitizeSchema,
  tagNames: [
    'p', 'strong', 'em', 'del', 'a', 'br', 'code',
    'ul', 'ol', 'li', 'blockquote',
    'h3', 'h4',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
  ],
}
