import { DEMO_REDIS_NAMESPACE } from '@queuekit/shared'

export const DEMO_KEY_PATTERN = /^[a-zA-Z0-9:_-]+$/
export const DEMO_KEY_MAX_LENGTH = 64
export const DEMO_VALUE_MAX_LENGTH = 1024
export const DEMO_TTL_MAX_SECONDS = 86_400
export const DEMO_BUCKET_MAX_LENGTH = 32

export const DEMO_NAMESPACE_LABEL = DEMO_REDIS_NAMESPACE

export function validateDemoKeySuffix(key: string): string | null {
  const trimmed = key.trim()
  if (!trimmed) {
    return 'Key is required.'
  }
  if (trimmed.length > DEMO_KEY_MAX_LENGTH) {
    return `Key must be at most ${DEMO_KEY_MAX_LENGTH} characters.`
  }
  if (!DEMO_KEY_PATTERN.test(trimmed)) {
    return 'Key may only contain letters, numbers, :, _, -.'
  }
  if (trimmed.startsWith(DEMO_REDIS_NAMESPACE)) {
    return 'Send the key suffix only — the demo namespace is applied by the API.'
  }
  return null
}

export function validateDemoValue(value: string): string | null {
  if (!value) {
    return 'Value is required.'
  }
  if (value.length > DEMO_VALUE_MAX_LENGTH) {
    return `Value must be at most ${DEMO_VALUE_MAX_LENGTH} characters.`
  }
  return null
}

export function validateOptionalTtl(raw: string): { ok: true; value?: number } | { ok: false; error: string } {
  const trimmed = raw.trim()
  if (!trimmed) {
    return { ok: true }
  }
  const parsed = Number(trimmed)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return { ok: false, error: 'TTL must be a positive integer (seconds).' }
  }
  if (parsed > DEMO_TTL_MAX_SECONDS) {
    return { ok: false, error: `TTL must be at most ${DEMO_TTL_MAX_SECONDS} seconds.` }
  }
  return { ok: true, value: parsed }
}

export function validateDemoBucket(bucket: string): string | null {
  const trimmed = bucket.trim()
  if (!trimmed) {
    return null
  }
  if (trimmed.length > DEMO_BUCKET_MAX_LENGTH) {
    return `Bucket must be at most ${DEMO_BUCKET_MAX_LENGTH} characters.`
  }
  if (!DEMO_KEY_PATTERN.test(trimmed)) {
    return 'Bucket may only contain letters, numbers, :, _, -.'
  }
  return null
}

export function formatTtl(ttlSeconds: number | null): string {
  if (ttlSeconds === null) {
    return 'No expiry'
  }
  if (ttlSeconds < 0) {
    return 'Unknown'
  }
  if (ttlSeconds < 60) {
    return `${ttlSeconds}s`
  }
  const minutes = Math.floor(ttlSeconds / 60)
  const seconds = ttlSeconds % 60
  return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`
}
