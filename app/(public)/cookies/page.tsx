import type { Metadata } from 'next'
import { PageView, generatePageMetadata } from '@/components/public/PageView'

/**
 * Route for content/pages/cookies.md
 *
 * All copy, the hero image and the SEO fields live in that file. Edit it,
 * commit, deploy.
 */
export function generateMetadata(): Metadata {
  return generatePageMetadata('cookies', '/cookies', 'Cookie Policy')
}

export default function Page() {
  return (
    <PageView
      slug="cookies"
      path="/cookies"
      trail={[{ name: 'Home', path: '/' }, { name: 'Cookies', path: '/cookies' }]}
    />
  )
}
