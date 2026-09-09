import type { Metadata } from 'next'
import { PageView, generatePageMetadata } from '@/components/public/PageView'

/**
 * Route for the CMS page with slug 'terms'.
 * All copy, the hero image and the SEO fields are edited in Admin -> Pages.
 */
export const revalidate = 600

export function generateMetadata(): Promise<Metadata> {
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
