import { Container } from '@/components/ui/Container'

/**
 * Public loading skeleton.
 *
 * Mirrors the real page's block structure — hero, then a grid — so the layout
 * does not jump when content arrives. Fully aria-hidden with one polite status
 * message, rather than a screen reader reading out a dozen empty boxes.
 */
export default function Loading() {
  return (
    <div className="animate-pulse">
      <p role="status" className="sr-only">
        Loading page content
      </p>

      <div aria-hidden="true" className="border-b border-beige bg-ivory-soft">
        <Container size="wide" className="pt-16 pb-14 lg:pt-24">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
            <div className="flex flex-col gap-5">
              <div className="h-3 w-32 rounded-xs bg-beige-soft" />
              <div className="h-16 w-full max-w-md rounded-xs bg-beige-soft" />
              <div className="h-4 w-full max-w-sm rounded-xs bg-beige-soft" />
              <div className="h-4 w-3/4 max-w-sm rounded-xs bg-beige-soft" />
              <div className="mt-4 flex gap-3">
                <div className="h-13 w-44 rounded-xs bg-beige-soft" />
                <div className="h-13 w-44 rounded-xs bg-beige-soft" />
              </div>
            </div>
            <div className="aspect-[4/3] w-full rounded-sm bg-beige-soft" />
          </div>
        </Container>
      </div>

      <Container size="wide" className="py-(--spacing-section-sm)">
        <div aria-hidden="true" className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex flex-col gap-4">
              <div className="aspect-[4/3] w-full rounded-sm bg-beige-soft" />
              <div className="h-3 w-24 rounded-xs bg-beige-soft" />
              <div className="h-5 w-3/4 rounded-xs bg-beige-soft" />
              <div className="h-3.5 w-full rounded-xs bg-beige-soft" />
            </div>
          ))}
        </div>
      </Container>
    </div>
  )
}
