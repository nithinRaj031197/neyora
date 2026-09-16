import Link from 'next/link'
import { Wordmark } from '@/components/ui/Wordmark'

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-ivory px-6 py-24">
      <div className="w-full max-w-xl">
        <Wordmark className="text-2xl" />
        <p className="eyebrow mt-10">404</p>
        <h1 className="mt-4 text-(length:--text-display-md)">This page has not grown yet</h1>
        <p className="mt-5 max-w-[52ch] text-earth-soft">
          The link may be old, or the page may have been renamed. Everything we have is one of
          these:
        </p>

        <ul className="mt-8 grid gap-px overflow-hidden rounded-sm border border-beige bg-beige sm:grid-cols-2">
          {[
            { href: '/products', label: 'Products' },
            { href: '/recipes', label: 'Recipes' },
            { href: '/quality', label: 'Quality' },
            { href: '/contact', label: 'Contact us' },
          ].map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="flex h-full items-center bg-ivory px-5 py-4 text-[0.9375rem] text-forest transition-colors hover:bg-ivory-soft"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
