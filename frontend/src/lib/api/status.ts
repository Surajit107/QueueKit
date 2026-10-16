import type {
  DependencyStatus,
  SystemStatus,
  WorkerStatus,
} from '@queuekit/shared'

import { apiRequest } from '@/lib/api/client'
import { ApiClientError } from '@/lib/api/errors'

const DEPENDENCY_STATUSES = new Set<DependencyStatus>([
  'connected',
  'disconnected',
  'unknown',
  'offline',
])

const WORKER_STATUSES = new Set<WorkerStatus>(['active', 'unknown', 'offline'])

/**
 * GET /api/v1/status — validates the payload and never invents healthy defaults.
 */
export async function fetchSystemStatus(signal?: AbortSignal): Promise<SystemStatus> {
  const data = await apiRequest<unknown>('/api/v1/status', {
    method: 'GET',
    signal,
  })
  return parseSystemStatus(data)
}

/**
 * Maps a raw API `data` payload into SystemStatus.
 * Rejects unknown shapes instead of filling in optimistic defaults.
 */
export function parseSystemStatus(data: unknown): SystemStatus {
  if (!isRecord(data)) {
    throw new ApiClientError('System status payload was not an object.', {
      kind: 'parse',
    })
  }

  if (data.api !== 'ok') {
    throw new ApiClientError('System status payload missing a confirmed API ok value.', {
      kind: 'parse',
    })
  }

  if (!isDependencyStatus(data.redis)) {
    throw new ApiClientError('System status payload has an invalid Redis status.', {
      kind: 'parse',
    })
  }

  if (!isWorkerStatus(data.worker)) {
    throw new ApiClientError('System status payload has an invalid worker status.', {
      kind: 'parse',
    })
  }

  if (data.workerHeartbeatAt !== null && typeof data.workerHeartbeatAt !== 'string') {
    throw new ApiClientError('System status payload has an invalid workerHeartbeatAt.', {
      kind: 'parse',
    })
  }

  if (!Array.isArray(data.notes) || !data.notes.every((note) => typeof note === 'string')) {
    throw new ApiClientError('System status payload has invalid notes.', {
      kind: 'parse',
    })
  }

  return {
    api: 'ok',
    redis: data.redis,
    worker: data.worker,
    workerHeartbeatAt: data.workerHeartbeatAt,
    notes: [...data.notes],
  }
}

function isDependencyStatus(value: unknown): value is DependencyStatus {
  return typeof value === 'string' && DEPENDENCY_STATUSES.has(value as DependencyStatus)
}

function isWorkerStatus(value: unknown): value is WorkerStatus {
  return typeof value === 'string' && WORKER_STATUSES.has(value as WorkerStatus)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
