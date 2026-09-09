import type { Metadata } from 'next'
import { PageView, generatePageMetadata } from '@/components/public/PageView'

/**
 * Route for the CMS page with slug 'storage'.
 * All copy, the hero image and the SEO fields are edited in Admin -> Pages.
 */
export const revalidate = 600

export function generateMetadata(): Promise<Metadata> {
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
