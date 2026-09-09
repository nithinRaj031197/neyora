import type { Metadata } from 'next'
import { PageView, generatePageMetadata } from '@/components/public/PageView'

/**
 * Route for the CMS page with slug 'farm'.
 * All copy, the hero image and the SEO fields are edited in Admin -> Pages.
 */
export const revalidate = 600

export function generateMetadata(): Promise<Metadata> {
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
