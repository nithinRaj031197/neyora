import { cn } from '@/lib/utils/cn'

/**
 * Inline line icons — 1.5px stroke, `currentColor`, geometric (guidelines §6).
 *
 * Inline rather than an icon package: this is the complete set the site needs,
 * so shipping a dependency for it would cost bundle size for no benefit.
 */
export type IconName =
  | 'instagram'
  | 'facebook'
  | 'youtube'
  | 'whatsapp'
  | 'linkedin'
  | 'x'
  | 'arrow-right'
  | 'arrow-up-right'
  | 'clock'
  | 'users'
  | 'flame'
  | 'check'
  | 'chevron-down'
  | 'chevron-right'
  | 'mail'
  | 'phone'
  | 'pin'
  | 'link'
  | 'share'
  | 'search'
  | 'plus'
  | 'trash'
  | 'image'
  | 'external'
  | 'qr'
  | 'alert'
  | 'leaf'

const PATHS: Record<IconName, React.ReactNode> = {
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M17.5 6.5h.01" />
    </>
  ),
  facebook: <path d="M15 3h-2.5A3.5 3.5 0 0 0 9 6.5V9H7v3h2v9h3v-9h2.5l.5-3H12V6.5a1 1 0 0 1 1-1h2z" />,
  youtube: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="4" />
      <path d="M10.5 9.2l4.5 2.8-4.5 2.8z" />
    </>
  ),
  whatsapp: (
    <>
      <path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.6-4.8A8.5 8.5 0 1 1 21 11.5z" />
      <path d="M8.8 9.2c0 3 2.3 5.3 5.2 5.3.5 0 .9-.4.9-.9v-.7l-1.6-.6-.8.8a4.5 4.5 0 0 1-2.2-2.2l.8-.8-.6-1.6h-.8c-.5 0-.9.4-.9.9z" />
    </>
  ),
  linkedin: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2.5" />
      <path d="M7.5 10.5V17M7.5 7.5v.01M11.5 17v-3.6a2 2 0 0 1 4 0V17M11.5 10.5V17" />
    </>
  ),
  x: <path d="M4 4l7 8.5M20 20l-7-8.5M4 4h3l13 16h-3zM4.5 20L10 13.5M19.5 4L14 10.5" />,
  'arrow-right': <path d="M4 12h15m0 0-5.5-5.5M19 12l-5.5 5.5" />,
  'arrow-up-right': <path d="M7 17 17 7m0 0h-7m7 0v7" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0M15.5 5.2a3.2 3.2 0 0 1 0 5.6M17 19.5a5.5 5.5 0 0 0-1.6-3.9" />
    </>
  ),
  flame: <path d="M12 21c3.6 0 6-2.3 6-5.4 0-3.9-4-5.2-4-9.6-2.6 1.3-3.4 3.5-3.4 5.2 0 1.6-1 2.2-1.8 1.4-.7-.7-.8-1.9-.8-1.9C6.7 12.3 6 13.9 6 15.6 6 18.7 8.4 21 12 21z" />,
  check: <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />,
  'chevron-down': <path d="M5.5 9l6.5 6.5L18.5 9" />,
  'chevron-right': <path d="M9 5.5 15.5 12 9 18.5" />,
  mail: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <path d="m3.5 6.5 8.5 6.5 8.5-6.5" />
    </>
  ),
  phone: (
    <path d="M6 3.5h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16.5 16.5 0 0 1 4 5.5a2 2 0 0 1 2-2z" />
  ),
  pin: (
    <>
      <path d="M12 21.5s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z" />
      <circle cx="12" cy="10.5" r="2.6" />
    </>
  ),
  link: <path d="M9.5 14.5 14.5 9.5M10 6.5l1.5-1.5a4.2 4.2 0 0 1 6 6L16 12.5M14 17.5 12.5 19a4.2 4.2 0 0 1-6-6L8 11.5" />,
  share: (
    <>
      <circle cx="18" cy="5.5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="18.5" r="2.5" />
      <path d="m8.2 10.8 7.6-4M8.2 13.2l7.6 4" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  trash: <path d="M4 7h16M9.5 7V4.5h5V7M6 7l1 13h10l1-13M10 11v5M14 11v5" />,
  image: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="2" />
      <circle cx="8.5" cy="10" r="1.6" />
      <path d="m3.5 17.5 5-5 4.5 4.5 3-3 4.5 4.5" />
    </>
  ),
  external: <path d="M14 4h6v6M20 4 10 14M17 14.5V19a1.5 1.5 0 0 1-1.5 1.5H5.5A1.5 1.5 0 0 1 4 19V8.5A1.5 1.5 0 0 1 5.5 7H10" />,
  qr: (
    <>
      <rect x="3.5" y="3.5" width="6" height="6" rx="1" />
      <rect x="14.5" y="3.5" width="6" height="6" rx="1" />
      <rect x="3.5" y="14.5" width="6" height="6" rx="1" />
      <path d="M14.5 14.5h2.5v2.5h-2.5zM20.5 20.5H18V18h2.5z" />
    </>
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v5.5M12 16.2v.01" />
    </>
  ),
  leaf: <path d="M4 20c0-8 5-13 16-13 0 9-5 13-11 13a5 5 0 0 1-5-5zM4.5 19.5 12 12" />,
}

export function Icon({
  name,
  className,
  size = 20,
  strokeWidth = 1.5,
  label,
}: {
  name: IconName
  className?: string
  size?: number
  strokeWidth?: number
  /** Provide only when the icon is the sole content of a control. */
  label?: string
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('shrink-0', className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  )
}

/** Maps a `social_links.platform` value to an icon, with a safe default. */
export function socialIconName(platform: string): IconName {
  const map: Record<string, IconName> = {
    instagram: 'instagram',
    facebook: 'facebook',
    youtube: 'youtube',
    whatsapp: 'whatsapp',
    linkedin: 'linkedin',
    x: 'x',
    twitter: 'x',
  }
  return map[platform.toLowerCase()] ?? 'link'
}
