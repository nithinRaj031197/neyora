import type { Metadata } from 'next'
import { PageView, generatePageMetadata } from '@/components/public/PageView'

/**
 * Route for the CMS page with slug 'about'.
 * All copy, the hero image and the SEO fields are edited in Admin -> Pages.
 */
export const revalidate = 600

export function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata('about', '/about', 'About NEYORA')
}

export default function Page() {
  return (
    <PageView
      slug="about"
      path="/about"
      trail={[{ name: 'Home', path: '/' }, { name: 'About', path: '/about' }]}
    />
  )
}
