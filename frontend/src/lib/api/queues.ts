import {
  AvailableDemoQueues,
  DemoJobTypeEnum,
  type DemoJobType,
  type DemoQueueName,
} from '@queuekit/shared'

import { apiRequest } from '@/lib/api/client'
import { ApiClientError } from '@/lib/api/errors'

export type JobState =
  | 'waiting'
  | 'active'
  | 'delayed'
  | 'completed'
  | 'failed'
  | 'paused'
  | 'unknown'

export type JobView = {
  id: string
  name: string
  queueName: string
  state: JobState
  data: unknown
  result: unknown
  failedReason: string | null
  attemptsMade: number
  attemptsMax: number | null
  timestamp: number | null
  processedOn: number | null
  finishedOn: number | null
  delay: number | null
  priority: number | null
}

export type QueueMetrics = {
  queueName: string
  waiting: number
  active: number
  delayed: number
  completed: number
  failed: number
  paused: number
}

export type EnqueueJobInput = {
  type: DemoJobType
  payload?: Record<string, unknown>
  delayMs?: number
  priority?: number
}

const JOB_STATES = new Set<JobState>([
  'waiting',
  'active',
  'delayed',
  'completed',
  'failed',
  'paused',
  'unknown',
])

export function defaultDemoQueue(): DemoQueueName {
  return AvailableDemoQueues[0]
}

export async function listQueueJobs(
  queue: string,
  options: { start?: number; end?: number; signal?: AbortSignal } = {},
): Promise<{ jobs: JobView[]; queue: string }> {
  const params = new URLSearchParams()
  if (options.start !== undefined) params.set('start', String(options.start))
  if (options.end !== undefined) params.set('end', String(options.end))
  const query = params.toString()
  const path = `/api/v1/queues/${encodeURIComponent(queue)}/jobs${query ? `?${query}` : ''}`
  const data = await apiRequest<unknown>(path, { method: 'GET', signal: options.signal })
  return parseJobList(data)
}

export async function getQueueJob(
  queue: string,
  jobId: string,
  signal?: AbortSignal,
): Promise<JobView> {
  const data = await apiRequest<unknown>(
    `/api/v1/queues/${encodeURIComponent(queue)}/jobs/${encodeURIComponent(jobId)}`,
    { method: 'GET', signal },
  )
  return parseJobEnvelope(data)
}

export async function enqueueQueueJob(
  queue: string,
  input: EnqueueJobInput,
  signal?: AbortSignal,
): Promise<JobView> {
  const data = await apiRequest<unknown>(
    `/api/v1/queues/${encodeURIComponent(queue)}/jobs`,
    {
      method: 'POST',
      body: {
        type: input.type,
        payload: input.payload ?? {},
        ...(input.delayMs !== undefined ? { delayMs: input.delayMs } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
      },
      signal,
    },
  )
  return parseJobEnvelope(data)
}

export async function getQueueMetrics(
  queue: string,
  signal?: AbortSignal,
): Promise<QueueMetrics> {
  const data = await apiRequest<unknown>(
    `/api/v1/queues/${encodeURIComponent(queue)}/metrics`,
    { method: 'GET', signal },
  )
  return parseMetricsEnvelope(data)
}

export function parseJobList(data: unknown): { jobs: JobView[]; queue: string } {
  if (!isRecord(data) || !isString(data.queue) || !Array.isArray(data.jobs)) {
    throw new ApiClientError('Job list payload was invalid.', { kind: 'parse' })
  }
  return {
    queue: data.queue,
    jobs: data.jobs.map((job, index) => {
      try {
        return parseJobView(job)
      } catch {
        throw new ApiClientError(`Job list entry ${index} was invalid.`, { kind: 'parse' })
      }
    }),
  }
}

export function parseJobEnvelope(data: unknown): JobView {
  if (!isRecord(data) || !('job' in data)) {
    throw new ApiClientError('Job payload was invalid.', { kind: 'parse' })
  }
  return parseJobView(data.job)
}

export function parseMetricsEnvelope(data: unknown): QueueMetrics {
  if (!isRecord(data) || !('metrics' in data)) {
    throw new ApiClientError('Metrics payload was invalid.', { kind: 'parse' })
  }
  return parseQueueMetrics(data.metrics)
}

export function parseJobView(data: unknown): JobView {
  if (!isRecord(data)) {
    throw new ApiClientError('Job view was not an object.', { kind: 'parse' })
  }
  if (!isString(data.id) || !isString(data.name) || !isString(data.queueName)) {
    throw new ApiClientError('Job view identity fields were invalid.', { kind: 'parse' })
  }
  if (!isJobState(data.state)) {
    throw new ApiClientError('Job view state was invalid.', { kind: 'parse' })
  }
  if (typeof data.attemptsMade !== 'number') {
    throw new ApiClientError('Job view attemptsMade was invalid.', { kind: 'parse' })
  }
  if (data.attemptsMax !== null && typeof data.attemptsMax !== 'number') {
    throw new ApiClientError('Job view attemptsMax was invalid.', { kind: 'parse' })
  }
  if (data.failedReason !== null && !isString(data.failedReason)) {
    throw new ApiClientError('Job view failedReason was invalid.', { kind: 'parse' })
  }
  return {
    id: data.id,
    name: data.name,
    queueName: data.queueName,
    state: data.state,
    data: data.data,
    result: data.result,
    failedReason: data.failedReason,
    attemptsMade: data.attemptsMade,
    attemptsMax: data.attemptsMax,
    timestamp: nullableNumber(data.timestamp),
    processedOn: nullableNumber(data.processedOn),
    finishedOn: nullableNumber(data.finishedOn),
    delay: nullableNumber(data.delay),
    priority: nullableNumber(data.priority),
  }
}

export function parseQueueMetrics(data: unknown): QueueMetrics {
  if (!isRecord(data) || !isString(data.queueName)) {
    throw new ApiClientError('Queue metrics payload was invalid.', { kind: 'parse' })
  }
  for (const key of ['waiting', 'active', 'delayed', 'completed', 'failed', 'paused'] as const) {
    if (typeof data[key] !== 'number') {
      throw new ApiClientError(`Queue metrics.${key} was invalid.`, { kind: 'parse' })
    }
  }
  return {
    queueName: data.queueName,
    waiting: data.waiting as number,
    active: data.active as number,
    delayed: data.delayed as number,
    completed: data.completed as number,
    failed: data.failed as number,
    paused: data.paused as number,
  }
}

export function isDemoJobType(value: string): value is DemoJobType {
  return Object.values(DemoJobTypeEnum).includes(value as DemoJobType)
}

function isJobState(value: unknown): value is JobState {
  return typeof value === 'string' && JOB_STATES.has(value as JobState)
}

function nullableNumber(value: unknown): number | null {
  if (value === null) return null
  if (typeof value === 'number') return value
  throw new ApiClientError('Expected number or null.', { kind: 'parse' })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}
