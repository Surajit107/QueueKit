import {
  DemoJobTypeEnum,
  type DemoJobType,
} from '@queuekit/shared'

/** Matches toolkit QUEUE_BOUNDS.WORKER_CONCURRENCY — not API-configurable. */
export const DEMO_WORKER_CONCURRENCY = 2

export const DEMO_JOB_TYPES = [
  DemoJobTypeEnum.ECHO,
  DemoJobTypeEnum.DELAY,
  DemoJobTypeEnum.FAIL,
] as const

export const JOB_TYPE_COPY: Record<DemoJobType, string> = {
  echo: 'Echo — return the message payload',
  delay: 'Delay — sleep waitMs while active (≤5s server clamp)',
  fail: 'Fail — simulated failure with automatic retries',
}

export function validateEnqueueForm(input: {
  type: DemoJobType
  message: string
  waitMs: string
  failUntilAttempt: string
  delayMs: string
  priority: string
}): { ok: true; body: EnqueueBody } | { ok: false; error: string } {
  const payload: Record<string, unknown> = {}

  if (input.type === DemoJobTypeEnum.ECHO || input.type === DemoJobTypeEnum.FAIL) {
    const message = input.message.trim()
    if (!message) {
      return { ok: false, error: 'Message is required for this job type.' }
    }
    if (utf8Bytes(message) > 1_500) {
      return { ok: false, error: 'Message is too large for the demo payload budget.' }
    }
    payload.message = message
  }

  if (input.type === DemoJobTypeEnum.DELAY) {
    const waitMs = parseOptionalInt(input.waitMs, 'waitMs', 0, 5_000)
    if (!waitMs.ok) return waitMs
    if (waitMs.value !== undefined) payload.waitMs = waitMs.value
  }

  if (input.type === DemoJobTypeEnum.FAIL) {
    const attempt = parseOptionalInt(input.failUntilAttempt, 'failUntilAttempt', 1, 99)
    if (!attempt.ok) return attempt
    if (attempt.value !== undefined) payload.failUntilAttempt = attempt.value
  }

  const delayMs = parseOptionalInt(input.delayMs, 'delayMs', 0, 60_000)
  if (!delayMs.ok) return delayMs

  const priority = parseOptionalInt(input.priority, 'priority', 1, 10)
  if (!priority.ok) return priority

  if (utf8Bytes(JSON.stringify(payload)) > 2_048) {
    return { ok: false, error: 'Payload exceeds the 2048-byte demo limit.' }
  }

  return {
    ok: true,
    body: {
      type: input.type,
      payload,
      ...(delayMs.value !== undefined ? { delayMs: delayMs.value } : {}),
      ...(priority.value !== undefined ? { priority: priority.value } : {}),
    },
  }
}

export type EnqueueBody = {
  type: DemoJobType
  payload: Record<string, unknown>
  delayMs?: number
  priority?: number
}

function parseOptionalInt(
  raw: string,
  label: string,
  min: number,
  max: number,
): { ok: true; value?: number } | { ok: false; error: string } {
  const trimmed = raw.trim()
  if (!trimmed) {
    return { ok: true }
  }
  const value = Number(trimmed)
  if (!Number.isInteger(value) || value < min || value > max) {
    return { ok: false, error: `${label} must be an integer from ${min} to ${max}.` }
  }
  return { ok: true, value }
}

function utf8Bytes(value: string): number {
  return new TextEncoder().encode(value).length
}
