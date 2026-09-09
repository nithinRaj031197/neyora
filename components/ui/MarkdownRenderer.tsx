import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import rehypeSlug from 'rehype-slug'
import type { Components } from 'react-markdown'
import { cn } from '@/lib/utils/cn'
import { markdownSanitizeSchema, inlineMarkdownSanitizeSchema } from '@/lib/markdown/sanitize'

/**
 * Renders admin-authored Markdown.
 *
 * Security: react-markdown builds a React element tree — it never produces an
 * HTML string, and this codebase contains no `dangerouslySetInnerHTML`.
 * `rehype-sanitize` prunes that tree against an allow-list before React sees
 * it, so `<script>`, event handlers, inline styles and `javascript:` URLs are
 * dropped. Raw HTML in the source is not enabled at all (no `rehype-raw`).
 *
 * This is a Server Component: the Markdown is turned into HTML on the server
 * and no parser reaches the browser bundle.
 */

/** Plugin arrays hoisted to module scope so they are allocated once. */
const REMARK = [remarkGfm]
const REHYPE_FULL = [rehypeSlug, [rehypeSanitize, markdownSanitizeSchema]] as never[]
const REHYPE_INLINE = [[rehypeSanitize, inlineMarkdownSanitizeSchema]] as never[]

const components: Components = {
  /**
   * External links open in a new tab with noopener; internal ones do not.
   * Decided here rather than by the author, so no admin-authored attribute
   * can turn into a tabnabbing vector.
   */
  a({ href, children, ...props }) {
    const isExternal = typeof href === 'string' && /^https?:\/\//i.test(href)
    return (
      <a
        href={href}
        {...props}
        {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer nofollow' } : {})}
      >
        {children}
      </a>
    )
  },

  /** Tables scroll inside their own box so the page body never scrolls sideways. */
  table({ children, ...props }) {
    return (
      <div className="md-table-wrap" role="region" aria-label="Table" tabIndex={0}>
        <table {...props}>{children}</table>
      </div>
    )
  },

  /**
   * Markdown images become figures, and lazy-load. Width/height are unknown
   * for an arbitrary URL, so an explicit aspect box is not possible here —
   * this is why the CMS uses media-library fields for anything above the fold.
   */
  img({ src, alt, title }) {
    if (typeof src !== 'string') return null
    return (
      <figure>
        <img src={src} alt={alt ?? ''} loading="lazy" decoding="async" />
        {title ? <figcaption>{title}</figcaption> : null}
      </figure>
    )
  },
}

export function MarkdownRenderer({
  content,
  className,
  variant = 'default',
  invert = false,
}: {
  content: string | null | undefined
  className?: string
  /** 'compact' = tighter scale for cards and FAQ answers. */
  variant?: 'default' | 'compact'
  /** For dark sections. */
  invert?: boolean
}) {
  if (!content?.trim()) return null

  return (
    <div
      className={cn(
        'prose-neyora',
        variant === 'compact' && 'prose-compact',
        invert && 'prose-invert',
        className,
      )}
    >
      <Markdown
        remarkPlugins={REMARK}
        rehypePlugins={variant === 'compact' ? REHYPE_INLINE : REHYPE_FULL}
        components={components}
        // Raw HTML is never parsed; `skipHtml` also drops it from the output.
        skipHtml
      >
        {content}
      </Markdown>
    </div>
  )
}
