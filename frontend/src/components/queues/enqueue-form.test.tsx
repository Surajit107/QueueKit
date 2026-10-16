import { DemoJobTypeEnum } from '@queuekit/shared'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { EnqueueForm } from '@/components/queues/enqueue-form'
import type { JobView } from '@/lib/api/queues'
import { queueQueryKeys } from '@/lib/query-client'
import { renderWithProviders } from '@/test/render'

const enqueueQueueJob = vi.fn<(queue: string, body: unknown) => Promise<JobView>>()

vi.mock('@/lib/api/queues', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/queues')>()
  return {
    ...actual,
    enqueueQueueJob: (queue: string, body: unknown) => enqueueQueueJob(queue, body),
  }
})

const demoQueue = 'queuekit-demo'

const enqueuedJob: JobView = {
  id: 'job-1',
  name: DemoJobTypeEnum.ECHO,
  queueName: demoQueue,
  state: 'waiting',
  data: { message: 'hello' },
  result: null,
  failedReason: null,
  attemptsMade: 0,
  attemptsMax: 3,
  timestamp: Date.now(),
  processedOn: null,
  finishedOn: null,
  delay: null,
  priority: null,
}

describe('EnqueueForm', () => {
  beforeEach(() => {
    enqueueQueueJob.mockReset()
  })

  it('rejects an invalid payload before calling the API', async () => {
    const user = userEvent.setup()
    renderWithProviders(<EnqueueForm queue={demoQueue} />)

    await user.clear(screen.getByLabelText(/^Message$/i))
    await user.click(screen.getByRole('button', { name: 'Enqueue' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Message is required')
    expect(enqueueQueueJob).not.toHaveBeenCalled()
  })

  it('invalidates queue queries after a successful enqueue', async () => {
    enqueueQueueJob.mockResolvedValue(enqueuedJob)
    const user = userEvent.setup()

    const { queryClient } = renderWithProviders(<EnqueueForm queue={demoQueue} />)
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    await user.click(screen.getByRole('button', { name: 'Enqueue' }))

    await waitFor(() => expect(enqueueQueueJob).toHaveBeenCalled())

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queueQueryKeys.queue(demoQueue) })
    expect(await screen.findByText(`Enqueued ${enqueuedJob.id}`)).toBeInTheDocument()
  })
})
