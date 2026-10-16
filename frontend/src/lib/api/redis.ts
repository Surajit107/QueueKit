import { apiRequest } from '@/lib/api/client'
import { ApiClientError } from '@/lib/api/errors'

export type DemoKeyRecord = {
  key: string
  value: string
  ttlSeconds: number | null
}

export type DemoKeyList = {
  keys: string[]
}

export type DemoKeyDeleteResult = {
  key: string
  deleted: boolean
}

export type CreateDemoKeyInput = {
  key: string
  value: string
  ttlSeconds?: number
}

export type CacheAsideDemoResult = {
  hit: boolean
  value: {
    id: string
    name: string
    fetchedAt: string
  }
  latencyMs: number
  ttlSeconds: number | null
  metricsLabel: string
}

export type RateLimitDemoResult = {
  allowed: boolean
  limit: number
  remaining: number
  windowMs: number
  retryAfterMs: number | null
  bucket: string
}

export type RateLimitDemoInput = {
  bucket?: string
  limit?: number
  windowMs?: number
}

export type CacheAsideDemoInput = {
  forceMiss?: boolean
}

export async function listDemoKeys(signal?: AbortSignal): Promise<DemoKeyList> {
  const data = await apiRequest<unknown>('/api/v1/redis/demo/keys', {
    method: 'GET',
    signal,
  })
  return parseDemoKeyList(data)
}

export async function createDemoKey(
  input: CreateDemoKeyInput,
  signal?: AbortSignal,
): Promise<DemoKeyRecord> {
  const data = await apiRequest<unknown>('/api/v1/redis/demo/keys', {
    method: 'POST',
    body: input,
    signal,
  })
  return parseDemoKeyRecord(data)
}

export async function getDemoKey(key: string, signal?: AbortSignal): Promise<DemoKeyRecord> {
  const data = await apiRequest<unknown>(
    `/api/v1/redis/demo/keys/${encodeURIComponent(key)}`,
    { method: 'GET', signal },
  )
  return parseDemoKeyRecord(data)
}

export async function deleteDemoKey(
  key: string,
  signal?: AbortSignal,
): Promise<DemoKeyDeleteResult> {
  const data = await apiRequest<unknown>(
    `/api/v1/redis/demo/keys/${encodeURIComponent(key)}`,
    { method: 'DELETE', signal },
  )
  return parseDemoKeyDeleteResult(data)
}

export async function runCacheAsideDemo(
  input: CacheAsideDemoInput = {},
  signal?: AbortSignal,
): Promise<CacheAsideDemoResult> {
  const data = await apiRequest<unknown>('/api/v1/redis/demo/cache', {
    method: 'POST',
    body: input,
    signal,
  })
  return parseCacheAsideDemoResult(data)
}

/**
 * Success path only. Demo denials arrive as HTTP 429 + RATE_LIMITED;
 * callers should use `parseRateLimitDenial` on ApiClientError.details.
 */
export async function runRateLimitDemo(
  input: RateLimitDemoInput = {},
  signal?: AbortSignal,
): Promise<RateLimitDemoResult> {
  const data = await apiRequest<unknown>('/api/v1/redis/demo/rate-limit', {
    method: 'POST',
    body: input,
    signal,
  })
  return parseRateLimitDemoResult(data, input.bucket ?? 'default')
}

export function parseDemoKeyList(data: unknown): DemoKeyList {
  if (!isRecord(data) || !Array.isArray(data.keys) || !data.keys.every(isString)) {
    throw new ApiClientError('Demo key list payload was invalid.', { kind: 'parse' })
  }
  return { keys: [...data.keys] }
}

export function parseDemoKeyRecord(data: unknown): DemoKeyRecord {
  if (!isRecord(data) || !isString(data.key) || !isString(data.value)) {
    throw new ApiClientError('Demo key payload was invalid.', { kind: 'parse' })
  }
  if (data.ttlSeconds !== null && typeof data.ttlSeconds !== 'number') {
    throw new ApiClientError('Demo key TTL was invalid.', { kind: 'parse' })
  }
  return {
    key: data.key,
    value: data.value,
    ttlSeconds: data.ttlSeconds,
  }
}

export function parseDemoKeyDeleteResult(data: unknown): DemoKeyDeleteResult {
  if (!isRecord(data) || !isString(data.key) || typeof data.deleted !== 'boolean') {
    throw new ApiClientError('Demo key delete payload was invalid.', { kind: 'parse' })
  }
  return { key: data.key, deleted: data.deleted }
}

export function parseCacheAsideDemoResult(data: unknown): CacheAsideDemoResult {
  if (!isRecord(data) || typeof data.hit !== 'boolean' || typeof data.latencyMs !== 'number') {
    throw new ApiClientError('Cache-aside demo payload was invalid.', { kind: 'parse' })
  }
  if (data.ttlSeconds !== null && typeof data.ttlSeconds !== 'number') {
    throw new ApiClientError('Cache-aside TTL was invalid.', { kind: 'parse' })
  }
  if (!isString(data.metricsLabel) || !isRecord(data.value)) {
    throw new ApiClientError('Cache-aside value payload was invalid.', { kind: 'parse' })
  }
  if (!isString(data.value.id) || !isString(data.value.name) || !isString(data.value.fetchedAt)) {
    throw new ApiClientError('Cache-aside mock user payload was invalid.', { kind: 'parse' })
  }
  return {
    hit: data.hit,
    latencyMs: data.latencyMs,
    ttlSeconds: data.ttlSeconds,
    metricsLabel: data.metricsLabel,
    value: {
      id: data.value.id,
      name: data.value.name,
      fetchedAt: data.value.fetchedAt,
    },
  }
}

export function parseRateLimitDemoResult(
  data: unknown,
  fallbackBucket: string,
): RateLimitDemoResult {
  const base = parseRateLimitFields(data)
  if (!base) {
    throw new ApiClientError('Rate-limit demo payload was invalid.', { kind: 'parse' })
  }
  const bucket =
    isRecord(data) && isString(data.bucket) && data.bucket.length > 0
      ? data.bucket
      : fallbackBucket
  return { ...base, bucket }
}

/** Extracts RateLimitResult fields from a 429 error `details[0]` entry. */
export function parseRateLimitDenial(
  details: unknown[],
  fallbackBucket: string,
): RateLimitDemoResult | null {
  const first = details[0]
  const base = parseRateLimitFields(first)
  if (!base) {
    return null
  }
  const bucket =
    isRecord(first) && isString(first.bucket) && first.bucket.length > 0
      ? first.bucket
      : fallbackBucket
  return { ...base, allowed: false, bucket }
}

function parseRateLimitFields(
  data: unknown,
): Omit<RateLimitDemoResult, 'bucket'> | null {
  if (!isRecord(data)) {
    return null
  }
  if (
    typeof data.allowed !== 'boolean' ||
    typeof data.limit !== 'number' ||
    typeof data.remaining !== 'number' ||
    typeof data.windowMs !== 'number'
  ) {
    return null
  }
  if (data.retryAfterMs !== null && typeof data.retryAfterMs !== 'number') {
    return null
  }
  return {
    allowed: data.allowed,
    limit: data.limit,
    remaining: data.remaining,
    windowMs: data.windowMs,
    retryAfterMs: data.retryAfterMs,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}
