import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge, StatusBadge, isPublicationLive } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Alert } from '@/components/ui/Alert'
import { Wordmark } from '@/components/ui/Wordmark'
import { Picture } from '@/components/ui/Picture'
import { Pagination } from '@/components/ui/Pagination'
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer'
import { NutritionTable } from '@/components/public/NutritionTable'
import { RecipeSteps } from '@/components/public/RecipeSteps'
import type { Image } from '@/types/content'

describe('StatusBadge', () => {
  it('labels a published item', () => {
    render(<StatusBadge status="published" />)
    expect(screen.getByText('Published')).toBeInTheDocument()
  })

  it('labels a draft', () => {
    render(<StatusBadge status="draft" />)
    expect(screen.getByText('Draft')).toBeInTheDocument()
  })

  it('labels a future schedule as scheduled', () => {
    render(<StatusBadge status="scheduled" isLive={false} />)
    expect(screen.getByText('Scheduled')).toBeInTheDocument()
  })

  // A scheduled time in the past means the row is already public. Saying
  // "Scheduled" there would be a lie an editor would act on.
  it('labels an elapsed schedule as published', () => {
    render(<StatusBadge status="scheduled" isLive />)
    expect(screen.getByText('Published')).toBeInTheDocument()
  })

  it('defaults to "Scheduled" when liveness was not computed', () => {
    render(<StatusBadge status="scheduled" />)
    expect(screen.getByText('Scheduled')).toBeInTheDocument()
  })
})

describe('isPublicationLive', () => {
  const now = new Date('2026-06-15T12:00:00Z').getTime()

  it('treats a published row as live', () => {
    expect(isPublicationLive('published', null, now)).toBe(true)
  })

  it('treats a draft as not live, whatever its scheduled date', () => {
    expect(isPublicationLive('draft', '2020-01-01T00:00:00Z', now)).toBe(false)
  })

  // The DB makes a scheduled row public via published_at, with no cron job —
  // so an elapsed schedule really is live, and the badge must say so.
  it('treats an elapsed schedule as live', () => {
    expect(isPublicationLive('scheduled', '2026-06-01T00:00:00Z', now)).toBe(true)
  })

  it('treats a future schedule as not yet live', () => {
    expect(isPublicationLive('scheduled', '2026-07-01T00:00:00Z', now)).toBe(false)
  })

  it('treats a scheduled row with no date as not live', () => {
    expect(isPublicationLive('scheduled', null, now)).toBe(false)
  })

  it('treats an unparseable date as not live rather than throwing', () => {
    expect(isPublicationLive('scheduled', 'not a date', now)).toBe(false)
  })
})

describe('Badge', () => {
  it('renders its content', () => {
    render(<Badge tone="leaf">Featured</Badge>)
    expect(screen.getByText('Featured')).toBeInTheDocument()
  })
})

describe('Alert', () => {
  it('uses an assertive live region for errors only', () => {
    const { unmount } = render(<Alert tone="danger" title="Failed">Nope</Alert>)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    unmount()

    render(<Alert tone="success" title="Saved">Yes</Alert>)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})

describe('EmptyState', () => {
  it('offers the next useful action', () => {
    render(
      <EmptyState
        title="No recipes yet"
        description="Write the first one."
        actionLabel="Create a recipe"
        actionHref="/admin/recipes/new"
      />,
    )
    expect(screen.getByRole('heading', { name: 'No recipes yet' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /create a recipe/i })).toHaveAttribute(
      'href',
      '/admin/recipes/new',
    )
  })
})

describe('Wordmark', () => {
  it('renders the brand name as live, selectable text', () => {
    render(<Wordmark brandName="NEYORA" showTagline tagline="GROWN FOR LIFE." />)
    expect(screen.getByText('NEYORA')).toBeInTheDocument()
    expect(screen.getByText('GROWN FOR LIFE.')).toBeInTheDocument()
  })

  it('accepts a different brand name, since the CMS controls it', () => {
    render(<Wordmark brandName="OTHER" />)
    expect(screen.getByText('OTHER')).toBeInTheDocument()
  })
})

describe('Picture', () => {
  const image: Image = {
    src: '/images/recipes/garlic-butter-oyster-mushrooms.svg',
    alt: 'Grey oyster mushrooms on linen',
    width: 1600,
    height: 1200,
  }

  it('renders the image with its source and alt text', () => {
    render(<Picture image={image} sizes="50vw" />)
    const img = screen.getByRole('img', { name: image.alt })
    expect(img).toHaveAttribute('src', image.src)
    expect(img).toHaveAttribute('sizes', '50vw')
  })

  // Without explicit dimensions the browser cannot reserve space, and the page
  // jumps as images load. This is the single biggest CLS cause.
  it('sets explicit dimensions so there is no layout shift', () => {
    render(<Picture image={image} />)
    const img = screen.getByRole('img', { name: image.alt })
    expect(img).toHaveAttribute('width', '1600')
    expect(img).toHaveAttribute('height', '1200')
  })

  it('lazy-loads by default and eager-loads only when marked priority', () => {
    const { unmount } = render(<Picture image={image} />)
    expect(screen.getByRole('img', { name: image.alt })).toHaveAttribute('loading', 'lazy')
    unmount()

    render(<Picture image={image} priority />)
    expect(screen.getByRole('img', { name: image.alt })).toHaveAttribute('loading', 'eager')
  })

  it('uses the content alt text unless overridden', () => {
    render(<Picture image={image} alt="Overridden" />)
    expect(screen.getByRole('img', { name: 'Overridden' })).toBeInTheDocument()
  })

  it('renders a decorative image with an empty alt, hidden from the a11y tree', () => {
    render(<Picture image={image} alt="" />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('renders a placeholder rather than a broken image when there is none', () => {
    render(<Picture image={null} aspect="4 / 3" />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})

describe('Pagination', () => {
  it('renders nothing on a single page', () => {
    const { container } = render(
      <Pagination page={1} pageSize={12} total={5} basePath="/recipes" />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('links forward but not back on the first page', () => {
    render(<Pagination page={1} pageSize={12} total={40} basePath="/recipes" />)
    expect(screen.getByRole('link', { name: /next/i })).toHaveAttribute('href', '/recipes?page=2')
    expect(screen.queryByRole('link', { name: /previous/i })).not.toBeInTheDocument()
  })

  it('preserves existing filters in its links', () => {
    render(
      <Pagination
        page={2}
        pageSize={12}
        total={40}
        basePath="/recipes"
        params={{ tag: 'one-pan' }}
      />,
    )
    expect(screen.getByRole('link', { name: /next/i })).toHaveAttribute(
      'href',
      '/recipes?tag=one-pan&page=3',
    )
    // Page 1 omits the page param entirely, keeping the canonical URL clean.
    expect(screen.getByRole('link', { name: /previous/i })).toHaveAttribute(
      'href',
      '/recipes?tag=one-pan',
    )
  })
})

describe('MarkdownRenderer', () => {
  it('renders headings, emphasis and lists', () => {
    render(<MarkdownRenderer content={'## Method\n\n- **Heat** the pan\n- Add _butter_'} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Method' })).toBeInTheDocument()
    expect(screen.getByText('Heat')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('renders GFM tables inside a scroll container', () => {
    render(<MarkdownRenderer content={'| A | B |\n| --- | --- |\n| 1 | 2 |'} />)
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Table' })).toBeInTheDocument()
  })

  it('opens external links safely and leaves internal ones alone', () => {
    render(<MarkdownRenderer content={'[out](https://example.com) and [in](/farm)'} />)
    const external = screen.getByRole('link', { name: 'out' })
    expect(external).toHaveAttribute('target', '_blank')
    expect(external.getAttribute('rel')).toContain('noopener')

    const internal = screen.getByRole('link', { name: 'in' })
    expect(internal).not.toHaveAttribute('target')
  })

  it('renders blockquotes and horizontal rules', () => {
    render(<MarkdownRenderer content={'> A note\n\n---\n\nAfter'} />)
    expect(screen.getByText('A note')).toBeInTheDocument()
    expect(document.querySelector('hr')).toBeInTheDocument()
  })

  it('renders nothing at all for empty content', () => {
    const { container } = render(<MarkdownRenderer content="   " />)
    expect(container).toBeEmptyDOMElement()
  })

  // The security-critical cases. Admin-authored Markdown is rendered on public
  // pages, so a compromised or careless admin must not be able to inject
  // script. rehype-sanitize prunes the React tree before it renders.
  it('never renders a script tag', () => {
    render(<MarkdownRenderer content={'<script>window.__pwned = true</script>\n\nSafe text'} />)
    expect(document.querySelector('script')).toBeNull()
    expect(screen.getByText('Safe text')).toBeInTheDocument()
  })

  it('never renders an iframe', () => {
    render(<MarkdownRenderer content={'<iframe src="https://evil.example"></iframe>'} />)
    expect(document.querySelector('iframe')).toBeNull()
  })

  it('strips a javascript: link href', () => {
    render(<MarkdownRenderer content={'[click](javascript:alert(1))'} />)
    const link = screen.queryByRole('link', { name: 'click' })
    expect(link?.getAttribute('href') ?? '').not.toContain('javascript:')
  })

  it('strips an event-handler attribute', () => {
    render(<MarkdownRenderer content={'<img src="x" onerror="alert(1)" alt="x">'} />)
    expect(document.querySelector('[onerror]')).toBeNull()
  })

  it('strips an inline style attribute', () => {
    render(<MarkdownRenderer content={'<p style="position:fixed;inset:0">covering</p>'} />)
    expect(document.querySelector('[style]')).toBeNull()
  })

  it('does not render a data: URI image', () => {
    render(<MarkdownRenderer content={'![x](data:text/html;base64,PHNjcmlwdD4=)'} />)
    const img = document.querySelector('img')
    expect(img?.getAttribute('src') ?? '').not.toContain('data:')
  })
})

describe('NutritionTable', () => {
  it('renders the figures with their basis and caveat', () => {
    render(
      <NutritionTable
        nutrition={{
          basis: 'Per 100 g, raw',
          per: [{ label: 'Protein', value: '3.3', unit: 'g' }],
          note: 'Estimated values.',
        }}
      />,
    )
    expect(screen.getByText('Per 100 g, raw')).toBeInTheDocument()
    expect(screen.getByRole('rowheader', { name: 'Protein' })).toBeInTheDocument()
    // The caveat is part of the content, not fine print to be hidden.
    expect(screen.getByText('Estimated values.')).toBeInTheDocument()
  })

  it('renders nothing when there are no figures', () => {
    const { container } = render(<NutritionTable nutrition={{ per: [] }} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('RecipeSteps', () => {
  it('numbers the steps and anchors each one for JSON-LD deep links', () => {
    render(
      <RecipeSteps
        steps={[
          { title: 'Clean gently', body: 'Brush away substrate.' },
          { body: 'Heat the pan.', durationMinutes: 3 },
        ]}
      />,
    )
    expect(screen.getByRole('heading', { level: 3, name: 'Clean gently' })).toBeInTheDocument()
    expect(screen.getByText('Heat the pan.')).toBeInTheDocument()
    expect(screen.getByText('3 min')).toBeInTheDocument()
    expect(document.querySelector('#step-1')).toBeInTheDocument()
    expect(document.querySelector('#step-2')).toBeInTheDocument()
  })

  it('renders nothing when there are no steps', () => {
    const { container } = render(<RecipeSteps steps={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
