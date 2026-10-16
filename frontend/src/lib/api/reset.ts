import { apiRequest } from '@/lib/api/client'
import { ApiClientError } from '@/lib/api/errors'

export type DemoResetResult = {
  deletedKeys: number
  prefix: string
  queuesReset: string[]
}

/**
 * POST /api/v1/demo/reset — requires confirm: true (server + UI).
 * Namespace enforcement is server-side; client only validates response shape.
 */
export async function resetDemoResources(signal?: AbortSignal): Promise<DemoResetResult> {
  const data = await apiRequest<unknown>('/api/v1/demo/reset', {
    method: 'POST',
    body: { confirm: true },
    signal,
  })
  return parseDemoResetResult(data)
}

export function parseDemoResetResult(data: unknown): DemoResetResult {
  if (!isRecord(data)) {
    throw new ApiClientError('Demo reset payload was invalid.', { kind: 'parse' })
  }
  if (typeof data.deletedKeys !== 'number' || !isString(data.prefix) || data.prefix.length === 0) {
    throw new ApiClientError('Demo reset payload fields were invalid.', { kind: 'parse' })
  }
  if (!Array.isArray(data.queuesReset) || !data.queuesReset.every(isString)) {
    throw new ApiClientError('Demo reset queuesReset was invalid.', { kind: 'parse' })
  }
  return {
    deletedKeys: data.deletedKeys,
    prefix: data.prefix,
    queuesReset: [...data.queuesReset],
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}
