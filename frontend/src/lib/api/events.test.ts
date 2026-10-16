import { describe, it, expect, vi } from 'vitest'
import { DemoEventEnum } from '@queuekit/shared'

import {
  JOB_SSE_TYPES,
  buildJobEventsUrl,
  parseJobSsePayload,
} from '@/lib/api/events'

describe('buildJobEventsUrl', () => {
  it('returns null when API base URL is unset', () => {
    vi.stubEnv('NEXT_PUBLIC_QUEUEKIT_API_URL', '')
    expect(buildJobEventsUrl()).toBeNull()
  })

  it('joins default job SSE types into query string', () => {
    vi.stubEnv('NEXT_PUBLIC_QUEUEKIT_API_URL', 'http://localhost:3001/')
    const url = buildJobEventsUrl()
    expect(url).toBe(
      `http://localhost:3001/api/v1/events?types=${encodeURIComponent(JOB_SSE_TYPES.join(','))}`,
    )
  })

  it('accepts custom type allowlist', () => {
    vi.stubEnv('NEXT_PUBLIC_QUEUEKIT_API_URL', 'http://localhost:3001')
    const url = buildJobEventsUrl([DemoEventEnum.JOB_FAILED])
    expect(url).toContain('types=job.failed')
  })
})

describe('parseJobSsePayload', () => {
  it('accepts allowlisted job event types', () => {
    const payload = {
      type: DemoEventEnum.JOB_ACTIVE,
      at: '2020-01-01T00:00:00.000Z',
      data: { queue: 'queuekit-demo', jobId: '1' },
    }
    expect(parseJobSsePayload(payload)).toEqual(payload)
  })

  it('rejects non-allowlisted event types', () => {
    expect(
      parseJobSsePayload({
        type: DemoEventEnum.REDIS_KEY_CHANGED,
        at: 't',
        data: {},
      }),
    ).toBeNull()
  })

  it('returns null for malformed payloads', () => {
    expect(parseJobSsePayload(null)).toBeNull()
    expect(parseJobSsePayload({ type: DemoEventEnum.JOB_WAITING, at: 't' })).toBeNull()
    expect(parseJobSsePayload({ type: 'job.waiting', at: 1, data: {} })).toBeNull()
  })
})
