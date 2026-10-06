import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BagsState } from '@/lib/farm/actions'

/*
 * The picker is the one farm control with real interaction in it, and the
 * interaction is the point: an admin in a growing room with three bag numbers
 * in their head. These cover that path without a browser or a spreadsheet.
 */
const loadBagsAction = vi.fn<(batchId: string) => Promise<BagsState>>()
vi.mock('@/lib/farm/actions', () => ({ loadBagsAction: (id: string) => loadBagsAction(id) }))

const { BagPicker } = await import('@/components/admin/farm/BagPicker')

const BATCH = 'BAT-202610-001'
const bags = (count: number, reported: number[] = []) =>
  Array.from({ length: count }, (_, i) => ({
    bagId: `${BATCH}-B${String(i + 1).padStart(3, '0')}`,
    bagNumber: i + 1,
    previouslyReported: reported.includes(i + 1),
  }))

function Harness() {
  const [selected, setSelected] = useState<string[]>([])
  return <BagPicker batchId={BATCH} selected={selected} onChange={setSelected} />
}

beforeEach(() => {
  vi.clearAllMocks()
  loadBagsAction.mockResolvedValue({ status: 'ok', bags: bags(100, [13]) })
})

describe('bag picker', () => {
  it('asks for the bags of its batch, once', async () => {
    render(<Harness />)
    await screen.findByRole('button', { name: `${BATCH}-B001` })
    expect(loadBagsAction).toHaveBeenCalledExactlyOnceWith(BATCH)
  })

  it('finds a bag by the number printed on it', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await screen.findByRole('button', { name: `${BATCH}-B001` })

    // "13" is what the admin reads off the bag — not the full id.
    await user.type(screen.getByRole('searchbox', { name: /find a bag/i }), '13')
    await waitFor(() => expect(screen.queryByRole('button', { name: `${BATCH}-B001` })).toBeNull())
    expect(screen.getByRole('button', { name: /B013/ })).toBeInTheDocument()
  })

  it('selects several bags and submits them as hidden fields', async () => {
    const user = userEvent.setup()
    const { container } = render(<Harness />)
    await screen.findByRole('button', { name: `${BATCH}-B001` })

    for (const n of ['B013', 'B018', 'B026']) {
      await user.click(screen.getByRole('button', { name: new RegExp(n) }))
    }

    expect(screen.getByText('3 of 100 bags selected')).toBeInTheDocument()
    const posted = [...container.querySelectorAll('input[name="bagIds"]')].map(
      (input) => (input as HTMLInputElement).value,
    )
    expect(posted).toEqual([`${BATCH}-B013`, `${BATCH}-B018`, `${BATCH}-B026`])
  })

  it('keeps a selected bag that the search has filtered out of view', async () => {
    const user = userEvent.setup()
    const { container } = render(<Harness />)
    await screen.findByRole('button', { name: `${BATCH}-B001` })

    await user.click(screen.getByRole('button', { name: `${BATCH}-B014` }))
    await user.type(screen.getByRole('searchbox', { name: /find a bag/i }), '77')

    // The chip is gone from the grid; the bag is still being submitted.
    expect(screen.queryByRole('button', { name: `${BATCH}-B014` })).toBeNull()
    expect(
      [...container.querySelectorAll('input[name="bagIds"]')].map((i) => (i as HTMLInputElement).value),
    ).toEqual([`${BATCH}-B014`])
  })

  it('clears the whole selection', async () => {
    const user = userEvent.setup()
    const { container } = render(<Harness />)
    await screen.findByRole('button', { name: `${BATCH}-B001` })

    await user.click(screen.getByRole('button', { name: `${BATCH}-B014` }))
    await user.click(screen.getByRole('button', { name: /^clear$/i }))

    expect(container.querySelectorAll('input[name="bagIds"]')).toHaveLength(0)
    expect(screen.getByText('100 bags')).toBeInTheDocument()
  })

  it('marks a previously reported bag without preventing its selection', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const marked = await screen.findByRole('button', { name: `${BATCH}-B013, previously reported` })

    expect(marked).not.toBeDisabled()
    await user.click(marked)
    expect(marked).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/already named in an earlier report/i)).toBeInTheDocument()
  })

  it('offers a retry when Google is unreachable', async () => {
    const user = userEvent.setup()
    loadBagsAction.mockResolvedValueOnce({
      status: 'error',
      message: 'Could not reach the spreadsheet. Try again.',
    })
    render(<Harness />)

    await screen.findByText('Could not reach the spreadsheet. Try again.')
    await user.click(screen.getByRole('button', { name: /try again/i }))

    await screen.findByRole('button', { name: `${BATCH}-B001` })
    expect(loadBagsAction).toHaveBeenCalledTimes(2)
  })

  it('explains an empty Bags tab instead of showing an empty grid', async () => {
    loadBagsAction.mockResolvedValue({ status: 'ok', bags: [] })
    render(<Harness />)
    expect(await screen.findByText(/no bag records for this batch yet/i)).toBeInTheDocument()
  })

  it('says so when nothing matches the search', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await screen.findByRole('button', { name: `${BATCH}-B001` })

    await user.type(screen.getByRole('searchbox', { name: /find a bag/i }), 'zzz')
    expect(await screen.findByText(/no bag matches/i)).toBeInTheDocument()
  })
})
