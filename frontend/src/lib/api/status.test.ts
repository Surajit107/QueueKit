import { describe, it, expect, vi, beforeEach } from 'vitest'

import { apiRequest } from '@/lib/api/client'
import { ApiClientError, isApiClientError } from '@/lib/api/errors'
import { fetchSystemStatus, parseSystemStatus } from '@/lib/api/status'

vi.mock('@/lib/api/client', () => ({
  apiRequest: vi.fn(),
}))

const mockedApiRequest = vi.mocked(apiRequest)

const validStatus = {
  api: 'ok',
  redis: 'connected',
  worker: 'active',
  workerHeartbeatAt: null,
  notes: ['demo'],
} as const

describe('parseSystemStatus', () => {
  it('accepts a valid system status payload', () => {
    expect(parseSystemStatus(validStatus)).toEqual({
      api: 'ok',
      redis: 'connected',
      worker: 'active',
      workerHeartbeatAt: null,
      notes: ['demo'],
    })
  })

  it('copies notes array defensively', () => {
    const notes = ['a']
    const parsed = parseSystemStatus({ ...validStatus, notes })
    notes.push('mutated')
    expect(parsed.notes).toEqual(['a'])
  })

  it('rejects non-object payloads', () => {
    expect(() => parseSystemStatus(null)).toThrow(ApiClientError)
    expect(() => parseSystemStatus('ok')).toThrow(/not an object/)
  })

  it('rejects missing or non-ok api field (no invented healthy default)', () => {
    expect(() => parseSystemStatus({ ...validStatus, api: 'healthy' })).toThrow(/API ok/)
  })

  it('rejects invalid redis status values', () => {
    expect(() => parseSystemStatus({ ...validStatus, redis: 'healthy' })).toThrow(/Redis/)
    expect(() => parseSystemStatus({ ...validStatus, redis: 1 })).toThrow(/Redis/)
  })

  it('rejects invalid worker status values', () => {
    expect(() => parseSystemStatus({ ...validStatus, worker: 'running' })).toThrow(/worker/)
  })

  it('rejects invalid workerHeartbeatAt', () => {
    expect(() =>
      parseSystemStatus({ ...validStatus, workerHeartbeatAt: 123 }),
    ).toThrow(/workerHeartbeatAt/)
  })

  it('rejects invalid notes', () => {
    expect(() => parseSystemStatus({ ...validStatus, notes: 'nope' })).toThrow(/notes/)
    expect(() => parseSystemStatus({ ...validStatus, notes: [1] })).toThrow(/notes/)
  })
})

describe('fetchSystemStatus', () => {
  beforeEach(() => {
    mockedApiRequest.mockReset()
  })

  it('delegates to apiRequest and parses the result', async () => {
    mockedApiRequest.mockResolvedValue(validStatus)

    await expect(fetchSystemStatus()).resolves.toEqual(parseSystemStatus(validStatus))
    expect(mockedApiRequest).toHaveBeenCalledWith('/api/v1/status', {
      method: 'GET',
      signal: undefined,
    })
  })

  it('surfaces parse errors from invalid API data', async () => {
    mockedApiRequest.mockResolvedValue({
      api: 'ok',
      redis: 'bogus',
      worker: 'active',
      workerHeartbeatAt: null,
      notes: [],
    })

    await expect(fetchSystemStatus()).rejects.toSatisfy((err: unknown) => {
      return isApiClientError(err) && err.kind === 'parse'
    })
  })
})
