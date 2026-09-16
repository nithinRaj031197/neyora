'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'

export function HeaderFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isHome = pathname === '/'
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])

  return (
    <header
      data-home={isHome ? 'true' : undefined}
      data-scrolled={scrolled ? 'true' : undefined}
      className={cn('site-header sticky top-0 z-50')}
      style={{ ['--nav-height' as string]: '4.25rem' }}
    >
      {children}
    </header>
  )
}
