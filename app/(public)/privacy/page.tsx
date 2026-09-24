import type { Metadata } from 'next'
import { PageView, generatePageMetadata } from '@/components/public/PageView'

/**
 * Route for content/pages/privacy.md
 *
 * All copy, the hero image and the SEO fields live in that file. Edit it,
 * commit, deploy.
 */
export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata('privacy', '/privacy', 'Privacy Policy')
}

export default function Page() {
  return (
    <PageView
      slug="privacy"
      path="/privacy"
      trail={[{ name: 'Home', path: '/' }, { name: 'Privacy', path: '/privacy' }]}
    />
  )
}
