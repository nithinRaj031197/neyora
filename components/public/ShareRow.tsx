'use client'

import { useState } from 'react'
import { Icon } from '@/components/ui/Icon'

/**
 * Share controls for a recipe.
 *
 * Uses the Web Share API when the browser has one — on a phone that gives the
 * native sheet, which is where a recipe actually gets shared — and falls back
 * to explicit WhatsApp/Facebook links plus copy-to-clipboard.
 *
 * Instagram has no share URL for third-party sites, so we do not pretend
 * otherwise: the recipe's Open Graph image is what makes a pasted link look
 * right in a story or DM.
 */
export function ShareRow({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false)

  const encodedUrl = encodeURIComponent(url)
  const encodedText = encodeURIComponent(`${title} — ${url}`)

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2200)
    } catch {
      // Clipboard can be blocked by permissions policy; the links still work.
      setCopied(false)
    }
  }

  async function nativeShare() {
    if (!navigator.share) return
    try {
      await navigator.share({ title, url })
    } catch {
      // The user dismissed the sheet. Not an error.
    }
  }

  const buttonClass =
    'inline-flex h-10 items-center gap-2 rounded-xs border border-beige px-3.5 text-[0.8125rem] font-medium tracking-[0.04em] text-earth-soft uppercase transition-colors hover:border-forest/50 hover:text-forest'

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="eyebrow mr-1">Share</span>

      {typeof navigator !== 'undefined' && 'share' in navigator ? (
        <button type="button" onClick={nativeShare} className={buttonClass}>
          <Icon name="share" size={16} />
          Share
        </button>
      ) : null}

      <a
        href={`https://wa.me/?text=${encodedText}`}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClass}
      >
        <Icon name="whatsapp" size={16} />
        WhatsApp
      </a>

      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClass}
      >
        <Icon name="facebook" size={16} />
        Facebook
      </a>

      <button type="button" onClick={copyLink} className={buttonClass}>
        <Icon name={copied ? 'check' : 'link'} size={16} />
        {copied ? 'Copied' : 'Copy link'}
      </button>

      {/* Announced to screen readers without stealing focus. */}
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? 'Link copied to clipboard' : ''}
      </span>
    </div>
  )
}
