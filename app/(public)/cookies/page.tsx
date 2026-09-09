import type { Metadata } from 'next'
import { PageView, generatePageMetadata } from '@/components/public/PageView'

/**
 * Route for the CMS page with slug 'cookies'.
 * All copy, the hero image and the SEO fields are edited in Admin -> Pages.
 */
export const revalidate = 600

export function generateMetadata(): Promise<Metadata> {
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
