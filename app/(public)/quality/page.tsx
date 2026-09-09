import type { Metadata } from 'next'
import { PageView, generatePageMetadata } from '@/components/public/PageView'

/**
 * Route for content/pages/quality.md
 *
 * All copy, the hero image and the SEO fields live in that file. Edit it,
 * commit, deploy.
 */
export function generateMetadata(): Metadata {
  return generatePageMetadata('quality', '/quality', 'Quality & Growing')
}

export default function Page() {
  return (
    <PageView
      slug="quality"
      path="/quality"
      trail={[{ name: 'Home', path: '/' }, { name: 'Quality', path: '/quality' }]}
    />
  )
}
