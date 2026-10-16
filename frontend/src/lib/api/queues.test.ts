import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DemoJobTypeEnum } from '@queuekit/shared'

import { apiRequest } from '@/lib/api/client'
import { ApiClientError } from '@/lib/api/errors'
import {
  enqueueQueueJob,
  getQueueJob,
  getQueueMetrics,
  listQueueJobs,
  parseJobEnvelope,
  parseJobList,
  parseJobView,
  parseMetricsEnvelope,
  parseQueueMetrics,
} from '@/lib/api/queues'

vi.mock('@/lib/api/client', () => ({
  apiRequest: vi.fn(),
}))

const mockedApiRequest = vi.mocked(apiRequest)

const jobPayload = {
  id: '1',
  name: 'echo',
  queueName: 'queuekit-demo',
  state: 'waiting',
  data: { message: 'hi' },
  result: null,
  failedReason: null,
  attemptsMade: 0,
  attemptsMax: null,
  timestamp: 1,
  processedOn: null,
  finishedOn: null,
  delay: null,
  priority: null,
}

describe('queue parsers', () => {
  it('parseJobView accepts a valid job', () => {
    expect(parseJobView(jobPayload)).toEqual(jobPayload)
  })

  it('parseJobView rejects invalid state', () => {
    expect(() => parseJobView({ ...jobPayload, state: 'bogus' })).toThrow(ApiClientError)
  })

  it('parseJobEnvelope unwraps job field', () => {
    expect(parseJobEnvelope({ job: jobPayload })).toEqual(jobPayload)
  })

  it('parseJobList maps jobs and preserves queue name', () => {
    expect(parseJobList({ queue: 'queuekit-demo', jobs: [jobPayload] })).toEqual({
      queue: 'queuekit-demo',
      jobs: [jobPayload],
    })
  })

  it('parseQueueMetrics requires numeric counters', () => {
    const metrics = {
      queueName: 'queuekit-demo',
      waiting: 1,
      active: 0,
      delayed: 0,
      completed: 0,
      failed: 0,
      paused: 0,
    }
    expect(parseQueueMetrics(metrics)).toEqual(metrics)
    expect(() => parseQueueMetrics({ ...metrics, waiting: '1' })).toThrow(ApiClientError)
  })

  it('parseMetricsEnvelope unwraps metrics', () => {
    const metrics = {
      queueName: 'queuekit-demo',
      waiting: 0,
      active: 0,
      delayed: 0,
      completed: 0,
      failed: 0,
      paused: 0,
    }
    expect(parseMetricsEnvelope({ metrics })).toEqual(metrics)
  })
})

describe('queue request helpers', () => {
  beforeEach(() => {
    mockedApiRequest.mockReset()
  })

  it('listQueueJobs builds query string and parses response', async () => {
    mockedApiRequest.mockResolvedValue({ queue: 'queuekit-demo', jobs: [jobPayload] })
    const result = await listQueueJobs('queuekit-demo', { start: 0, end: 10 })
    expect(mockedApiRequest).toHaveBeenCalledWith(
      '/api/v1/queues/queuekit-demo/jobs?start=0&end=10',
      { method: 'GET', signal: undefined },
    )
    expect(result.jobs).toHaveLength(1)
  })

  it('getQueueJob GETs encoded job id', async () => {
    mockedApiRequest.mockResolvedValue({ job: jobPayload })
    await getQueueJob('queuekit-demo', 'job/1')
    expect(mockedApiRequest).toHaveBeenCalledWith(
      '/api/v1/queues/queuekit-demo/jobs/job%2F1',
      { method: 'GET', signal: undefined },
    )
  })

  it('enqueueQueueJob POSTs type and payload defaults', async () => {
    mockedApiRequest.mockResolvedValue({ job: jobPayload })
    await enqueueQueueJob('queuekit-demo', { type: DemoJobTypeEnum.ECHO })
    expect(mockedApiRequest).toHaveBeenCalledWith('/api/v1/queues/queuekit-demo/jobs', {
      method: 'POST',
      body: { type: DemoJobTypeEnum.ECHO, payload: {} },
      signal: undefined,
    })
  })

  it('enqueueQueueJob includes delayMs and priority when set', async () => {
    mockedApiRequest.mockResolvedValue({ job: jobPayload })
    await enqueueQueueJob('queuekit-demo', {
      type: DemoJobTypeEnum.DELAY,
      payload: { waitMs: 100 },
      delayMs: 500,
      priority: 2,
    })
    expect(mockedApiRequest).toHaveBeenCalledWith('/api/v1/queues/queuekit-demo/jobs', {
      method: 'POST',
      body: {
        type: DemoJobTypeEnum.DELAY,
        payload: { waitMs: 100 },
        delayMs: 500,
        priority: 2,
      },
      signal: undefined,
    })
  })

  it('getQueueMetrics GETs metrics path', async () => {
    const metrics = {
      queueName: 'queuekit-demo',
      waiting: 0,
      active: 0,
      delayed: 0,
      completed: 0,
      failed: 0,
      paused: 0,
    }
    mockedApiRequest.mockResolvedValue({ metrics })
    await expect(getQueueMetrics('queuekit-demo')).resolves.toEqual(metrics)
  })
})
