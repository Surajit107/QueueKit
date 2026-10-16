import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { CacheLab } from '@/components/playground/cache-lab'
import type { CacheAsideDemoResult } from '@/lib/api'
import { renderWithProviders } from '@/test/render'

vi.mock('next/navigation', () => ({
  usePathname: () => '/playground/cache',
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string
    children: React.ReactNode
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

const runCacheAsideDemo = vi.fn<(input: { forceMiss: boolean }) => Promise<CacheAsideDemoResult>>()

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    runCacheAsideDemo: (input: { forceMiss: boolean }) => runCacheAsideDemo(input),
  }
})

const hitResult: CacheAsideDemoResult = {
  hit: true,
  value: { id: 1, name: 'Demo User' },
  ttlSeconds: 120,
  latencyMs: 12,
  metricsLabel: 'Demo cache metrics (session)',
}

const missResult: CacheAsideDemoResult = {
  hit: false,
  value: { id: 1, name: 'Demo User' },
  ttlSeconds: 120,
  latencyMs: 48,
  metricsLabel: 'Demo cache metrics (session)',
}

describe('CacheLab', () => {
  beforeEach(() => {
    runCacheAsideDemo.mockReset()
  })

  it('shows hit copy and session metrics label after a cache hit', async () => {
    runCacheAsideDemo.mockResolvedValue(hitResult)
    const user = userEvent.setup()

    renderWithProviders(<CacheLab />)

    await user.click(screen.getByRole('button', { name: 'Load (allow hit)' }))

    await waitFor(() => expect(runCacheAsideDemo).toHaveBeenCalledWith({ forceMiss: false }))

    expect(await screen.findByText('Hit')).toBeInTheDocument()
    expect(screen.getByText('Value served from Redis cache.')).toBeInTheDocument()
    expect(screen.getByText(hitResult.metricsLabel)).toBeInTheDocument()
    expect(screen.getByText('Hits').closest('div')).toHaveTextContent('1')
  })

  it('shows miss copy and increments misses after force miss', async () => {
    runCacheAsideDemo.mockResolvedValue(missResult)
    const user = userEvent.setup()

    renderWithProviders(<CacheLab />)

    await user.click(screen.getByRole('button', { name: 'Force miss' }))

    await waitFor(() => expect(runCacheAsideDemo).toHaveBeenCalledWith({ forceMiss: true }))

    expect(await screen.findByText('Miss')).toBeInTheDocument()
    expect(
      screen.getByText('Value loaded from the mock source and stored in cache.'),
    ).toBeInTheDocument()
    expect(screen.getByText(missResult.metricsLabel)).toBeInTheDocument()
  })
})
