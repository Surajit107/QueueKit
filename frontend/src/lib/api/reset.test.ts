import { describe, it, expect, vi, beforeEach } from 'vitest'

import { apiRequest } from '@/lib/api/client'
import { ApiClientError } from '@/lib/api/errors'
import { parseDemoResetResult, resetDemoResources } from '@/lib/api/reset'

vi.mock('@/lib/api/client', () => ({
  apiRequest: vi.fn(),
}))

const mockedApiRequest = vi.mocked(apiRequest)

const validReset = {
  deletedKeys: 3,
  prefix: 'queuekit:demo:',
  queuesReset: ['queuekit-demo'],
}

describe('parseDemoResetResult', () => {
  it('accepts a valid reset payload', () => {
    expect(parseDemoResetResult(validReset)).toEqual(validReset)
  })

  it('rejects empty prefix', () => {
    expect(() => parseDemoResetResult({ ...validReset, prefix: '' })).toThrow(ApiClientError)
  })

  it('rejects non-string queuesReset entries', () => {
    expect(() => parseDemoResetResult({ ...validReset, queuesReset: [1] })).toThrow(ApiClientError)
  })
})

describe('resetDemoResources', () => {
  beforeEach(() => {
    mockedApiRequest.mockReset()
  })

  it('POSTs confirm:true to demo reset endpoint', async () => {
    mockedApiRequest.mockResolvedValue(validReset)
    await expect(resetDemoResources()).resolves.toEqual(validReset)
    expect(mockedApiRequest).toHaveBeenCalledWith('/api/v1/demo/reset', {
      method: 'POST',
      body: { confirm: true },
      signal: undefined,
    })
  })
})
