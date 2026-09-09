import type { Metadata } from 'next'
import { PageView, generatePageMetadata } from '@/components/public/PageView'

/**
 * Route for the CMS page with slug 'quality'.
 * All copy, the hero image and the SEO fields are edited in Admin -> Pages.
 */
export const revalidate = 600

export function generateMetadata(): Promise<Metadata> {
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
