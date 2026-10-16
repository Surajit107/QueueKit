import type { ReactNode } from 'react'
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { JobDetailLab } from '@/components/queues/job-detail-lab'
import { ApiClientError } from '@/lib/api/errors'
import type { JobView } from '@/lib/api/queues'
import { renderWithProviders } from '@/test/render'

const getQueueJob = vi.fn<(queue: string, jobId: string, signal?: AbortSignal) => Promise<JobView>>()
const searchParams = vi.fn(() => new URLSearchParams('id=missing-job'))

vi.mock('@/lib/api/queues', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/queues')>()
  return {
    ...actual,
    getQueueJob: (queue: string, jobId: string, signal?: AbortSignal) =>
      getQueueJob(queue, jobId, signal),
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

vi.mock('next/navigation', () => ({
  usePathname: () => '/queues/jobs/detail',
  useSearchParams: () => searchParams(),
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

const sampleJob: JobView = {
  id: 'job-detail-1',
  name: 'fail',
  queueName: 'queuekit-demo',
  state: 'failed',
  data: { message: 'boom' },
  result: null,
  failedReason: 'Simulated failure (sanitized)',
  attemptsMade: 2,
  attemptsMax: 3,
  timestamp: new Date('2024-06-01T10:00:00Z').getTime(),
  processedOn: new Date('2024-06-01T10:00:05Z').getTime(),
  finishedOn: new Date('2024-06-01T10:00:06Z').getTime(),
  delay: 0,
  priority: 5,
}

describe('JobDetailLab', () => {
  beforeEach(() => {
    getQueueJob.mockReset()
    searchParams.mockReturnValue(new URLSearchParams('id=missing-job'))
  })

  it('shows attempts, timestamps, result, and sanitized failed reason', async () => {
    searchParams.mockReturnValue(new URLSearchParams('id=job-detail-1'))
    getQueueJob.mockResolvedValue(sampleJob)

    renderWithProviders(<JobDetailLab />)

    expect(await screen.findByText('job-detail-1')).toBeInTheDocument()
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
    expect(screen.getByText('Simulated failure (sanitized)')).toBeInTheDocument()
    expect(screen.getByText(/"message": "boom"/)).toBeInTheDocument()
    expect(screen.getByText('null')).toBeInTheDocument()
  })

  it('shows job unavailable UI when the API returns 404', async () => {
    getQueueJob.mockRejectedValue(
      new ApiClientError('Job not found', { kind: 'http', status: 404 }),
    )

    renderWithProviders(<JobDetailLab />)

    await waitFor(() => expect(getQueueJob).toHaveBeenCalled())

    expect(await screen.findByText('Job unavailable')).toBeInTheDocument()
    expect(screen.getByText('Job not found')).toBeInTheDocument()
  })
})
