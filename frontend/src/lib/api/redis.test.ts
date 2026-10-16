import { describe, it, expect, vi, beforeEach } from 'vitest'

import { apiRequest } from '@/lib/api/client'
import { ApiClientError } from '@/lib/api/errors'
import {
  createDemoKey,
  deleteDemoKey,
  getDemoKey,
  listDemoKeys,
  parseCacheAsideDemoResult,
  parseDemoKeyDeleteResult,
  parseDemoKeyList,
  parseDemoKeyRecord,
  parseRateLimitDemoResult,
  parseRateLimitDenial,
  runCacheAsideDemo,
  runRateLimitDemo,
} from '@/lib/api/redis'

vi.mock('@/lib/api/client', () => ({
  apiRequest: vi.fn(),
}))

const mockedApiRequest = vi.mocked(apiRequest)

describe('redis demo parsers', () => {
  it('parseDemoKeyList accepts valid keys array', () => {
    expect(parseDemoKeyList({ keys: ['a', 'b'] })).toEqual({ keys: ['a', 'b'] })
  })

  it('parseDemoKeyList rejects invalid shape', () => {
    expect(() => parseDemoKeyList({ keys: [1] })).toThrow(ApiClientError)
  })

  it('parseDemoKeyRecord validates ttlSeconds', () => {
    expect(parseDemoKeyRecord({ key: 'k', value: 'v', ttlSeconds: null })).toEqual({
      key: 'k',
      value: 'v',
      ttlSeconds: null,
    })
    expect(() => parseDemoKeyRecord({ key: 'k', value: 'v', ttlSeconds: 'x' })).toThrow(
      ApiClientError,
    )
  })

  it('parseDemoKeyDeleteResult requires boolean deleted', () => {
    expect(parseDemoKeyDeleteResult({ key: 'k', deleted: true })).toEqual({
      key: 'k',
      deleted: true,
    })
  })

  it('parseCacheAsideDemoResult validates nested value', () => {
    const payload = {
      hit: false,
      latencyMs: 12,
      ttlSeconds: 60,
      metricsLabel: 'cache-aside',
      value: { id: '1', name: 'n', fetchedAt: '2020-01-01T00:00:00.000Z' },
    }
    expect(parseCacheAsideDemoResult(payload)).toEqual(payload)
  })

  it('parseRateLimitDemoResult uses fallback bucket when omitted', () => {
    const fields = {
      allowed: true,
      limit: 10,
      remaining: 9,
      windowMs: 1000,
      retryAfterMs: null,
    }
    expect(parseRateLimitDemoResult(fields, 'default')).toEqual({ ...fields, bucket: 'default' })
    expect(parseRateLimitDemoResult({ ...fields, bucket: 'lab' }, 'default').bucket).toBe('lab')
  })

  it('parseRateLimitDenial extracts 429 details', () => {
    const denial = parseRateLimitDenial(
      [
        {
          allowed: false,
          limit: 5,
          remaining: 0,
          windowMs: 1000,
          retryAfterMs: 500,
          bucket: 'x',
        },
      ],
      'default',
    )
    expect(denial).toEqual({
      allowed: false,
      limit: 5,
      remaining: 0,
      windowMs: 1000,
      retryAfterMs: 500,
      bucket: 'x',
    })
  })
})

describe('redis demo request helpers', () => {
  beforeEach(() => {
    mockedApiRequest.mockReset()
  })

  it('listDemoKeys GETs demo keys path', async () => {
    mockedApiRequest.mockResolvedValue({ keys: [] })
    await listDemoKeys()
    expect(mockedApiRequest).toHaveBeenCalledWith('/api/v1/redis/demo/keys', {
      method: 'GET',
      signal: undefined,
    })
  })

  it('createDemoKey POSTs body', async () => {
    const record = { key: 'k', value: 'v', ttlSeconds: null }
    mockedApiRequest.mockResolvedValue(record)
    await expect(createDemoKey({ key: 'k', value: 'v' })).resolves.toEqual(record)
    expect(mockedApiRequest).toHaveBeenCalledWith('/api/v1/redis/demo/keys', {
      method: 'POST',
      body: { key: 'k', value: 'v' },
      signal: undefined,
    })
  })

  it('getDemoKey encodes key in path', async () => {
    mockedApiRequest.mockResolvedValue({ key: 'a b', value: 'v', ttlSeconds: null })
    await getDemoKey('a b')
    expect(mockedApiRequest).toHaveBeenCalledWith('/api/v1/redis/demo/keys/a%20b', {
      method: 'GET',
      signal: undefined,
    })
  })

  it('deleteDemoKey DELETEs encoded key', async () => {
    mockedApiRequest.mockResolvedValue({ key: 'k', deleted: true })
    await deleteDemoKey('k')
    expect(mockedApiRequest).toHaveBeenCalledWith('/api/v1/redis/demo/keys/k', {
      method: 'DELETE',
      signal: undefined,
    })
  })

  it('runCacheAsideDemo POSTs optional forceMiss', async () => {
    const result = {
      hit: true,
      latencyMs: 1,
      ttlSeconds: null,
      metricsLabel: 'm',
      value: { id: '1', name: 'n', fetchedAt: 't' },
    }
    mockedApiRequest.mockResolvedValue(result)
    await runCacheAsideDemo({ forceMiss: true })
    expect(mockedApiRequest).toHaveBeenCalledWith('/api/v1/redis/demo/cache', {
      method: 'POST',
      body: { forceMiss: true },
      signal: undefined,
    })
  })

  it('runRateLimitDemo POSTs input', async () => {
    mockedApiRequest.mockResolvedValue({
      allowed: true,
      limit: 1,
      remaining: 0,
      windowMs: 1000,
      retryAfterMs: null,
    })
    await runRateLimitDemo({ bucket: 'b', limit: 1 })
    expect(mockedApiRequest).toHaveBeenCalledWith('/api/v1/redis/demo/rate-limit', {
      method: 'POST',
      body: { bucket: 'b', limit: 1 },
      signal: undefined,
    })
  })
})
