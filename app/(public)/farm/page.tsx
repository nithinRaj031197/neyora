import type { Metadata } from 'next'
import { PageView, generatePageMetadata } from '@/components/public/PageView'

/**
 * Route for content/pages/farm.md
 *
 * All copy, the hero image and the SEO fields live in that file. Edit it,
 * commit, deploy.
 */
export function generateMetadata(): Metadata {
  return generatePageMetadata('farm', '/farm', 'Our Farm')
}

export default function Page() {
  return (
    <PageView
      slug="farm"
      path="/farm"
      trail={[{ name: 'Home', path: '/' }, { name: 'Our Farm', path: '/farm' }]}
    />
  )
}
