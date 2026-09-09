import type { Metadata } from 'next'
import { PageView, generatePageMetadata } from '@/components/public/PageView'

/**
 * Route for the CMS page with slug 'privacy'.
 * All copy, the hero image and the SEO fields are edited in Admin -> Pages.
 */
export const revalidate = 600

export function generateMetadata(): Promise<Metadata> {
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
