import type { Metadata } from 'next'
import { PageView, generatePageMetadata } from '@/components/public/PageView'

/**
 * Route for content/pages/storage.md
 *
 * All copy, the hero image and the SEO fields live in that file. Edit it,
 * commit, deploy.
 */
export function generateMetadata(): Metadata {
  return generatePageMetadata('storage', '/storage', 'How to Store')
}

export default function Page() {
  return (
    <PageView
      slug="storage"
      path="/storage"
      trail={[{ name: 'Home', path: '/' }, { name: 'How to Store', path: '/storage' }]}
    />
  )
}
