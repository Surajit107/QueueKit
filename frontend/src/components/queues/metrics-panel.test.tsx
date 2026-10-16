import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'

import { MetricsPanel } from '@/components/queues/metrics-panel'
import { renderWithProviders } from '@/test/render'
import { ApiClientError } from '@/lib/api/errors'
import type { QueueMetrics } from '@/lib/api/queues'

const getQueueMetrics = vi.fn()

vi.mock('@/lib/api/queues', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/queues')>()
  return {
    ...actual,
    getQueueMetrics: (...args: Parameters<typeof actual.getQueueMetrics>) => getQueueMetrics(...args),
  }
})

const metrics: QueueMetrics = {
  queueName: 'demo',
  waiting: 1,
  active: 2,
  delayed: 0,
  completed: 10,
  failed: 1,
  paused: 0,
}

describe('MetricsPanel', () => {
  beforeEach(() => {
    getQueueMetrics.mockReset()
  })

  it('shows skeleton placeholders while loading', () => {
    getQueueMetrics.mockReturnValue(new Promise(() => undefined))
    renderWithProviders(<MetricsPanel queue="demo" />)

    expect(screen.getByText('Queue metrics')).toBeInTheDocument()
    expect(document.querySelectorAll('[data-slot="skeleton"], .animate-pulse').length).toBeGreaterThan(0)
  })

  it('shows an error panel when metrics fail', async () => {
    getQueueMetrics.mockRejectedValue(new ApiClientError('Metrics down', { kind: 'http', status: 503 }))
    renderWithProviders(<MetricsPanel queue="demo" />)

    expect(await screen.findByText('Metrics unavailable')).toBeInTheDocument()
    expect(screen.getByText('Metrics down')).toBeInTheDocument()
  })

  it('renders metric counts on success', async () => {
    getQueueMetrics.mockResolvedValue(metrics)
    renderWithProviders(<MetricsPanel queue="demo" />)

    const waitingLabel = await screen.findByText('Waiting')
    const panel = waitingLabel.closest('dl')
    expect(panel).not.toBeNull()
    expect(panel).toHaveTextContent('Active')
    expect(panel).toHaveTextContent('Completed')
    expect(panel).toHaveTextContent('10')
    expect(panel).toHaveTextContent('2')
  })
})
