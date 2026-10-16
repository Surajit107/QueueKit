import type { ReactNode } from 'react'
import { ErrorCode } from '@queuekit/shared'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { LimitsLab } from '@/components/playground/limits-lab'
import { renderWithProviders } from '@/test/render'
import { ApiClientError } from '@/lib/api/errors'
import type { RateLimitDemoInput, RateLimitDemoResult } from '@/lib/api/redis'

vi.mock('next/navigation', () => ({
  usePathname: () => '/playground/limits',
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string
    children: ReactNode
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

const runRateLimitDemo = vi.fn<[RateLimitDemoInput], Promise<RateLimitDemoResult>>()

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    runRateLimitDemo: (...args: Parameters<typeof actual.runRateLimitDemo>) => runRateLimitDemo(...args),
  }
})

describe('LimitsLab', () => {
  beforeEach(() => {
    runRateLimitDemo.mockReset()
  })

  it('renders an allowed outcome from the API', async () => {
    const user = userEvent.setup()
    runRateLimitDemo.mockResolvedValue({
      allowed: true,
      limit: 5,
      remaining: 4,
      windowMs: 60_000,
      retryAfterMs: null,
      bucket: 'default',
    })

    renderWithProviders(<LimitsLab />)
    await user.click(screen.getByRole('button', { name: 'Consume' }))

    expect(await screen.findByText('Allowed')).toBeInTheDocument()
    expect(screen.getByText('Request counted against the demo bucket.')).toBeInTheDocument()
    expect(runRateLimitDemo).toHaveBeenCalledWith({
      bucket: 'default',
      limit: 5,
      windowMs: 60_000,
    })
  })

  it('maps a 429 RATE_LIMITED denial into the deny UI', async () => {
    const user = userEvent.setup()
    runRateLimitDemo.mockRejectedValue(
      new ApiClientError('Rate limited', {
        kind: 'http',
        status: 429,
        code: ErrorCode.RATE_LIMITED,
        details: [
          {
            allowed: false,
            limit: 5,
            remaining: 0,
            windowMs: 60_000,
            retryAfterMs: 12_000,
            bucket: 'default',
          },
        ],
      }),
    )

    renderWithProviders(<LimitsLab />)
    await user.click(screen.getByRole('button', { name: 'Consume' }))

    await waitFor(() => {
      expect(screen.getByText('Denied')).toBeInTheDocument()
    })
    expect(screen.getByText('Demo rate limit exceeded for this bucket and window.')).toBeInTheDocument()
    expect(screen.getByText('12000ms')).toBeInTheDocument()
    expect(screen.queryByText('Rate-limit demo failed')).not.toBeInTheDocument()
  })
})
