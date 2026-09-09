'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Icon, type IconName } from '@/components/ui/Icon'
import { cn } from '@/lib/utils/cn'
import { MediaPicker } from './MediaPicker'
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
  type EditResult,
  type Selection,
} from '@/lib/markdown/toolbar'

/**
 * Lazy-loaded so react-markdown, remark-gfm and rehype-sanitize stay out of
 * the initial admin bundle. The editor is usable the moment it paints; the
 * preview arrives a beat later.
 */
const MarkdownRenderer = dynamic(
  () => import('@/components/ui/MarkdownRenderer').then((m) => ({ default: m.MarkdownRenderer })),
  {
    ssr: false,
    loading: () => <p className="p-6 text-[0.875rem] text-earth-muted">Loading preview…</p>,
  },
)

type Mode = 'write' | 'preview' | 'split'

interface ToolbarAction {
  id: string
  label: string
  icon?: IconName
  text?: string
  shortcut?: string
  run: (sel: Selection) => EditResult
}

/**
 * The Markdown editor.
 *
 * Editor on the left, live preview on the right; on small screens the two
 * become tabs, since a split pane on a phone gives you two unusable columns.
 *
 * The preview runs the *same* sanitising pipeline as the public site, so what
 * an editor sees here is exactly what a visitor gets — including anything the
 * allow-list strips. A preview that renders more than production would be
 * worse than no preview.
 */
export function RichMarkdownEditor({
  name,
  defaultValue = '',
  label,
  hint,
  rows = 22,
  onChange,
}: {
  name: string
  defaultValue?: string
  label: string
  hint?: string
  rows?: number
  onChange?: (value: string) => void
}) {
  const [value, setValue] = useState(defaultValue)
  const [mode, setMode] = useState<Mode>('split')
  const [pickerOpen, setPickerOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const update = useCallback(
    (next: string) => {
      setValue(next)
      onChange?.(next)
    },
    [onChange],
  )

  /** Applies a transform and restores the caret/selection it asks for. */
  const apply = useCallback(
    (run: (sel: Selection) => EditResult) => {
      const textarea = textareaRef.current
      if (!textarea) return

      const result = run({
        value: textarea.value,
        start: textarea.selectionStart,
        end: textarea.selectionEnd,
      })

      update(result.value)

      // The DOM value updates on the next paint, so the selection has to be
      // restored after it — otherwise the caret jumps to the end.
      requestAnimationFrame(() => {
        textarea.focus()
        textarea.setSelectionRange(result.start, result.end)
      })
    },
    [update],
  )

  const actions = useMemo<ToolbarAction[][]>(
    () => [
      [
        { id: 'h2', label: 'Heading 2', text: 'H2', run: (s) => toggleHeading(s, 2) },
        { id: 'h3', label: 'Heading 3', text: 'H3', run: (s) => toggleHeading(s, 3) },
      ],
      [
        {
          id: 'bold',
          label: 'Bold',
          text: 'B',
          shortcut: '⌘B',
          run: (s) => toggleWrap(s, '**', 'bold text'),
        },
        {
          id: 'italic',
          label: 'Italic',
          text: 'I',
          shortcut: '⌘I',
          run: (s) => toggleWrap(s, '_', 'italic text'),
        },
      ],
      [
        { id: 'ul', label: 'Bulleted list', icon: 'chevron-right', run: (s) => toggleList(s, 'bullet') },
        { id: 'ol', label: 'Numbered list', text: '1.', run: (s) => toggleList(s, 'ordered') },
        { id: 'quote', label: 'Quote', text: '❝', run: toggleQuote },
      ],
      [
        { id: 'link', label: 'Link', icon: 'link', shortcut: '⌘K', run: (s) => insertLink(s) },
        { id: 'table', label: 'Table', text: '▦', run: (s) => insertBlock(s, TABLE_SNIPPET) },
        { id: 'hr', label: 'Horizontal rule', text: '—', run: (s) => insertBlock(s, HR_SNIPPET) },
        { id: 'code', label: 'Code block', text: '{ }', run: insertCodeBlock },
      ],
    ],
    [],
  )

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    const mod = event.metaKey || event.ctrlKey
    if (!mod) return

    const key = event.key.toLowerCase()
    if (key === 'b') {
      event.preventDefault()
      apply((s) => toggleWrap(s, '**', 'bold text'))
    } else if (key === 'i') {
      event.preventDefault()
      apply((s) => toggleWrap(s, '_', 'italic text'))
    } else if (key === 'k') {
      event.preventDefault()
      apply((s) => insertLink(s))
    }
  }

  const buttonClass =
    'inline-flex h-8 min-w-8 items-center justify-center rounded-xs px-2 text-[0.8125rem] font-medium text-earth-soft transition-colors hover:bg-earth/8 hover:text-forest'

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <label htmlFor={`${name}-editor`} className="text-[0.8125rem] font-medium text-earth">
            {label}
          </label>
          {hint ? (
            <p className="mt-1 max-w-[70ch] text-[0.75rem] leading-relaxed text-earth-muted">
              {hint}
            </p>
          ) : null}
        </div>

        {/* Mode switch. Split is hidden below lg because two columns on a
            phone is worse than either one alone. */}
        <div
          role="group"
          aria-label="Editor view"
          className="flex rounded-xs border border-beige bg-ivory p-0.5"
        >
          {(
            [
              { id: 'write', label: 'Edit' },
              { id: 'preview', label: 'Preview' },
              { id: 'split', label: 'Split', desktopOnly: true },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={mode === option.id}
              onClick={() => setMode(option.id)}
              className={cn(
                'h-8 rounded-xs px-3 text-[0.75rem] font-medium tracking-[0.06em] uppercase transition-colors',
                mode === option.id
                  ? 'bg-forest text-ivory'
                  : 'text-earth-muted hover:text-forest',
                'desktopOnly' in option && option.desktopOnly ? 'hidden lg:inline-flex' : '',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-sm border border-beige bg-ivory">
        <div className="flex flex-wrap items-center gap-1 border-b border-beige bg-ivory-soft px-2 py-1.5">
          {actions.map((group, groupIndex) => (
            <div key={groupIndex} className="flex items-center gap-0.5">
              {groupIndex > 0 ? (
                <span aria-hidden="true" className="mx-1 h-5 w-px bg-beige" />
              ) : null}
              {group.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => apply(action.run)}
                  title={action.shortcut ? `${action.label} (${action.shortcut})` : action.label}
                  aria-label={action.label}
                  className={buttonClass}
                >
                  {action.icon ? <Icon name={action.icon} size={15} /> : action.text}
                </button>
              ))}
            </div>
          ))}

          <span aria-hidden="true" className="mx-1 h-5 w-px bg-beige" />
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className={cn(buttonClass, 'gap-1.5 px-2.5')}
            aria-label="Insert image from media library"
          >
            <Icon name="image" size={15} />
            Image
          </button>

          <span className="ml-auto pr-1 text-[0.6875rem] text-earth-muted tabular-nums">
            {value.length.toLocaleString('en-GB')} chars
          </span>
        </div>

        <div
          className={cn(
            'grid',
            mode === 'split' ? 'lg:grid-cols-2 lg:divide-x lg:divide-beige' : 'grid-cols-1',
          )}
        >
          <div className={cn(mode === 'preview' && 'hidden', mode === 'split' && 'max-lg:block')}>
            <textarea
              id={`${name}-editor`}
              ref={textareaRef}
              name={name}
              value={value}
              onChange={(event) => update(event.target.value)}
              onKeyDown={onKeyDown}
              rows={rows}
              spellCheck
              className="block w-full resize-y bg-ivory px-4 py-4 font-mono text-[0.875rem] leading-relaxed text-earth focus:outline-none"
              placeholder={'## A heading\n\nWrite in Markdown. Headings, **bold**, lists, tables,\nblockquotes and links are all supported.'}
            />
          </div>

          <div
            className={cn(
              'min-w-0 bg-ivory-soft',
              mode === 'write' && 'hidden',
              mode === 'split' && 'hidden lg:block',
            )}
          >
            <div className="max-h-[40rem] overflow-y-auto px-5 py-5">
              {value.trim() ? (
                <MarkdownRenderer content={value} />
              ) : (
                <p className="text-[0.875rem] text-earth-muted">
                  Nothing to preview yet. Start typing on the left.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <p className="text-[0.75rem] text-earth-muted">
        Raw HTML is not rendered — the preview above runs the same sanitiser as the live site, so
        this is exactly what visitors will see.
      </p>

      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(media) => {
          apply((s) => insertImage(s, media.public_url, media.alt ?? 'Describe this image'))
          setPickerOpen(false)
        }}
      />
    </div>
  )
}
