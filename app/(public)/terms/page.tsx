import type { Metadata } from 'next'
import { PageView, generatePageMetadata } from '@/components/public/PageView'

/**
 * Route for content/pages/terms.md
 *
 * All copy, the hero image and the SEO fields live in that file. Edit it,
 * commit, deploy.
 */
export async function generateMetadata(): Promise<Metadata> {
  return generatePageMetadata('terms', '/terms', 'Terms & Conditions')
}

export default function Page() {
  return (
    <PageView
      slug="terms"
      path="/terms"
      trail={[{ name: 'Home', path: '/' }, { name: 'Terms', path: '/terms' }]}
    />
  )
}
