import { describe, it, expect } from 'vitest'
import { DemoJobTypeEnum } from '@queuekit/shared'

import { DEMO_JOB_TYPES, DEMO_WORKER_CONCURRENCY, validateEnqueueForm } from '@/lib/queue-demo'

const baseForm = {
  type: DemoJobTypeEnum.ECHO,
  message: 'hello',
  waitMs: '',
  failUntilAttempt: '',
  delayMs: '',
  priority: '',
}

describe('queue-demo constants', () => {
  it('exposes allowlisted demo job types', () => {
    expect(DEMO_JOB_TYPES).toContain(DemoJobTypeEnum.ECHO)
    expect(DEMO_WORKER_CONCURRENCY).toBe(2)
  })
})

describe('validateEnqueueForm', () => {
  it('requires message for echo jobs', () => {
    const result = validateEnqueueForm({ ...baseForm, message: '  ' })
    expect(result).toEqual({ ok: false, error: 'Message is required for this job type.' })
  })

  it('builds echo body with optional delay and priority', () => {
    const result = validateEnqueueForm({
      ...baseForm,
      delayMs: '1000',
      priority: '3',
    })
    expect(result).toEqual({
      ok: true,
      body: {
        type: DemoJobTypeEnum.ECHO,
        payload: { message: 'hello' },
        delayMs: 1000,
        priority: 3,
      },
    })
  })

  it('validates delay job waitMs bounds', () => {
    expect(
      validateEnqueueForm({
        ...baseForm,
        type: DemoJobTypeEnum.DELAY,
        message: '',
        waitMs: '6000',
      }),
    ).toMatchObject({ ok: false })

    const ok = validateEnqueueForm({
      ...baseForm,
      type: DemoJobTypeEnum.DELAY,
      message: '',
      waitMs: '500',
    })
    expect(ok).toMatchObject({ ok: true, body: { payload: { waitMs: 500 } } })
  })

  it('validates fail job message and failUntilAttempt', () => {
    const result = validateEnqueueForm({
      ...baseForm,
      type: DemoJobTypeEnum.FAIL,
      failUntilAttempt: '2',
    })
    expect(result).toMatchObject({
      ok: true,
      body: { payload: { message: 'hello', failUntilAttempt: 2 } },
    })
  })

  it('rejects out-of-range priority', () => {
    expect(
      validateEnqueueForm({ ...baseForm, priority: '99' }),
    ).toMatchObject({ ok: false })
  })
})
