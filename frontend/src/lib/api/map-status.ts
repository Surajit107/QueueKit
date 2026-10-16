import type { DependencyStatus, SystemStatus, WorkerStatus } from '@queuekit/shared'

import { isApiClientError } from '@/lib/api/errors'

/** UI-facing health labels — text + tone; never color-only. */
export type ServiceHealth = 'healthy' | 'degraded' | 'offline' | 'unknown' | 'reconnecting'

export type ServiceRow = {
  id: 'api' | 'redis' | 'worker'
  label: string
  status: ServiceHealth
  detail: string
}

export type StatusViewModel = {
  services: ServiceRow[]
  notes: string[]
  /** True when the last attempt failed and a refetch is in flight. */
  reconnecting: boolean
}

type MapStatusInput = {
  data: SystemStatus | undefined
  error: unknown
  isPending: boolean
  isFetching: boolean
  isError: boolean
}

/**
 * Builds honest service rows for the status panel.
 * Missing evidence stays unknown; failures do not invent healthy Redis/worker.
 */
export function mapSystemStatusToView(input: MapStatusInput): StatusViewModel {
  const reconnecting = input.isError && input.isFetching
  const staleAfterError = input.isError && Boolean(input.data) && !input.isFetching

  if (input.isPending && !input.data) {
    return {
      reconnecting: false,
      notes: [],
      services: [
        row('api', 'API', 'unknown', 'Checking API connectivity…'),
        row('redis', 'Redis', 'unknown', 'Waiting for a confirmed Redis report from the API.'),
        row('worker', 'Worker', 'unknown', 'Waiting for a confirmed worker report from the API.'),
      ],
    }
  }

  if (input.error && !input.data) {
    return {
      reconnecting,
      notes: [],
      services: failureRows(input.error, reconnecting),
    }
  }

  if (!input.data) {
    return {
      reconnecting: false,
      notes: [],
      services: [
        row('api', 'API', 'unknown', 'No status payload yet.'),
        row('redis', 'Redis', 'unknown', 'No Redis status confirmed.'),
        row('worker', 'Worker', 'unknown', 'No worker status confirmed.'),
      ],
    }
  }

  // Only the API row becomes degraded on a failed poll; Redis/worker keep
  // last-reported values (never upgraded to healthy from silence).
  const apiStatus: ServiceHealth = reconnecting
    ? 'reconnecting'
    : staleAfterError
      ? 'degraded'
      : 'healthy'

  const redisStatus = reconnecting ? 'reconnecting' : mapDependency(input.data.redis)
  const workerStatus = reconnecting ? 'reconnecting' : mapWorker(input.data.worker)

  const staleNote = staleAfterError
    ? ' Last reported — latest poll failed.'
    : ''

  return {
    reconnecting,
    notes: input.data.notes,
    services: [
      row(
        'api',
        'API',
        apiStatus,
        reconnecting
          ? 'Reconnecting to the API…'
          : staleAfterError
            ? 'API was reachable earlier; the latest status poll failed.'
            : 'API responded and confirmed process health.',
      ),
      row(
        'redis',
        'Redis',
        redisStatus,
        `${redisDetail(input.data.redis, reconnecting)}${staleNote}`,
      ),
      row(
        'worker',
        'Worker',
        workerStatus,
        `${workerDetail(input.data.worker, input.data.workerHeartbeatAt, reconnecting)}${staleNote}`,
      ),
    ],
  }
}

function failureRows(error: unknown, reconnecting: boolean): ServiceRow[] {
  const status: ServiceHealth = reconnecting ? 'reconnecting' : 'offline'
  const message = errorMessage(error)

  if (isApiClientError(error) && error.kind === 'config') {
    return [
      row('api', 'API', 'unknown', message),
      row('redis', 'Redis', 'unknown', 'Redis health is unknown until the API URL is configured.'),
      row('worker', 'Worker', 'unknown', 'Worker health is unknown until the API URL is configured.'),
    ]
  }

  return [
    row(
      'api',
      'API',
      status,
      reconnecting ? 'Reconnecting to the API…' : message,
    ),
    row(
      'redis',
      'Redis',
      'unknown',
      'Redis health is unknown because the API did not answer.',
    ),
    row(
      'worker',
      'Worker',
      'unknown',
      'Worker health is unknown because the API did not answer.',
    ),
  ]
}

function mapDependency(status: DependencyStatus): ServiceHealth {
  switch (status) {
    case 'connected':
      return 'healthy'
    case 'disconnected':
    case 'offline':
      return 'offline'
    case 'unknown':
      return 'unknown'
  }
}

function mapWorker(status: WorkerStatus): ServiceHealth {
  switch (status) {
    case 'active':
      return 'healthy'
    case 'offline':
      return 'offline'
    case 'unknown':
      return 'unknown'
  }
}

function redisDetail(status: DependencyStatus, reconnecting: boolean): string {
  if (reconnecting) {
    return 'Reconfirming Redis connectivity…'
  }
  switch (status) {
    case 'connected':
      return 'Redis reported connected by the API.'
    case 'disconnected':
      return 'Redis reported disconnected by the API.'
    case 'offline':
      return 'Redis reported offline by the API.'
    case 'unknown':
      return 'Redis status is unknown — the API did not confirm connectivity.'
  }
}

function workerDetail(
  status: WorkerStatus,
  heartbeatAt: string | null,
  reconnecting: boolean,
): string {
  if (reconnecting) {
    return 'Reconfirming worker health…'
  }
  const heartbeat =
    heartbeatAt !== null ? ` Last heartbeat: ${formatHeartbeat(heartbeatAt)}.` : ''
  switch (status) {
    case 'active':
      return `Worker reported active.${heartbeat}`
    case 'offline':
      return `Worker reported offline.${heartbeat}`
    case 'unknown':
      return `Worker status is unknown — not confirmed active.${heartbeat}`
  }
}

function formatHeartbeat(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return iso
  }
  return date.toLocaleString()
}

function errorMessage(error: unknown): string {
  if (isApiClientError(error)) {
    return error.message
  }
  if (error instanceof Error && error.message) {
    return error.message
  }
  return 'Unable to load system status.'
}

function row(
  id: ServiceRow['id'],
  label: string,
  status: ServiceHealth,
  detail: string,
): ServiceRow {
  return { id, label, status, detail }
}
