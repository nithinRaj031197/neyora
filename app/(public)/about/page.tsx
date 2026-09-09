import type { Metadata } from 'next'
import { PageView, generatePageMetadata } from '@/components/public/PageView'

/**
 * Route for content/pages/about.md
 *
 * All copy, the hero image and the SEO fields live in that file. Edit it,
 * commit, deploy.
 */
export function generateMetadata(): Metadata {
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
