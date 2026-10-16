import { DemoEventEnum, type DemoEvent } from '@queuekit/shared'

import { buildApiUrl } from '@/lib/api/config'

export const JOB_SSE_TYPES = [
  DemoEventEnum.JOB_WAITING,
  DemoEventEnum.JOB_ACTIVE,
  DemoEventEnum.JOB_COMPLETED,
  DemoEventEnum.JOB_FAILED,
] as const satisfies readonly DemoEvent[]

export type JobSseEventType = (typeof JOB_SSE_TYPES)[number]

export type JobSsePayload = {
  type: JobSseEventType
  at: string
  data: {
    queue?: string
    jobId?: string
    name?: string
    [key: string]: unknown
  }
}

export function buildJobEventsUrl(types: readonly DemoEvent[] = JOB_SSE_TYPES): string | null {
  const params = new URLSearchParams()
  params.set('types', types.join(','))
  return buildApiUrl(`/api/v1/events?${params.toString()}`)
}

export function parseJobSsePayload(raw: unknown): JobSsePayload | null {
  if (!isRecord(raw) || !isString(raw.type) || !isString(raw.at)) {
    return null
  }
  if (!JOB_SSE_TYPES.includes(raw.type as JobSseEventType)) {
    return null
  }
  if (!isRecord(raw.data)) {
    return null
  }
  return {
    type: raw.type as JobSseEventType,
    at: raw.at,
    data: raw.data,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}
