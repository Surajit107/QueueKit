import type { ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'

import { JobsLab } from '@/components/queues/jobs-lab'
import { renderWithProviders } from '@/test/render'
import type { JobView, QueueMetrics } from '@/lib/api/queues'

vi.mock('next/navigation', () => ({
  usePathname: () => '/queues/jobs',
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

const listQueueJobs = vi.fn()
const getQueueMetrics = vi.fn()

vi.mock('@/lib/api/queues', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/queues')>()
  return {
    ...actual,
    listQueueJobs: (...args: Parameters<typeof actual.listQueueJobs>) => listQueueJobs(...args),
    getQueueMetrics: (...args: Parameters<typeof actual.getQueueMetrics>) => getQueueMetrics(...args),
  }
})

vi.mock('@/hooks/use-queue-events', () => ({
  useQueueEvents: () => ({
    mode: 'idle' as const,
    lastEvent: null,
    error: null,
    restart: vi.fn(),
    stop: vi.fn(),
  }),
}))

function job(partial: Partial<JobView> & Pick<JobView, 'id' | 'state'>): JobView {
  return {
    name: partial.name ?? 'echo',
    queueName: partial.queueName ?? 'demo',
    data: partial.data ?? { message: 'hi' },
    result: partial.result ?? null,
    failedReason: partial.failedReason ?? null,
    attemptsMade: partial.attemptsMade ?? 0,
    attemptsMax: partial.attemptsMax ?? 3,
    timestamp: partial.timestamp ?? Date.now(),
    processedOn: partial.processedOn ?? null,
    finishedOn: partial.finishedOn ?? null,
    delay: partial.delay ?? null,
    priority: partial.priority ?? null,
    ...partial,
  }
}

const emptyMetrics: QueueMetrics = {
  queueName: 'demo',
  waiting: 0,
  active: 0,
  delayed: 0,
  completed: 0,
  failed: 0,
  paused: 0,
}

describe('JobsLab', () => {
  beforeEach(() => {
    getQueueMetrics.mockResolvedValue(emptyMetrics)
    listQueueJobs.mockReset()
  })

  it('maps lifecycle states to JobStateBadge labels', async () => {
    listQueueJobs.mockResolvedValue({
      queue: 'demo',
      jobs: [
        job({ id: 'j-wait', state: 'waiting' }),
        job({ id: 'j-active', state: 'active' }),
        job({ id: 'j-delayed', state: 'delayed' }),
        job({ id: 'j-done', state: 'completed' }),
        job({ id: 'j-fail', state: 'failed' }),
      ],
    })

    renderWithProviders(<JobsLab />)

    expect(await screen.findByLabelText('State: Waiting')).toBeInTheDocument()
    expect(screen.getByLabelText('State: Active')).toBeInTheDocument()
    expect(screen.getByLabelText('State: Delayed')).toBeInTheDocument()
    expect(screen.getByLabelText('State: Completed')).toBeInTheDocument()
    expect(screen.getByLabelText('State: Failed')).toBeInTheDocument()
  })
})
