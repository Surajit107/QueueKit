import { describe, it, expect } from 'vitest'
import { DEMO_REDIS_NAMESPACE } from '@queuekit/shared'

import {
  DEMO_KEY_MAX_LENGTH,
  DEMO_TTL_MAX_SECONDS,
  formatTtl,
  validateDemoBucket,
  validateDemoKeySuffix,
  validateDemoValue,
  validateOptionalTtl,
} from '@/lib/redis-demo'

describe('validateDemoKeySuffix', () => {
  it('requires non-empty trimmed key', () => {
    expect(validateDemoKeySuffix('')).toBe('Key is required.')
    expect(validateDemoKeySuffix('  ')).toBe('Key is required.')
  })

  it('enforces max length and character pattern', () => {
    expect(validateDemoKeySuffix('a'.repeat(DEMO_KEY_MAX_LENGTH + 1))).toMatch(/at most/)
    expect(validateDemoKeySuffix('bad key')).toMatch(/letters, numbers/)
  })

  it('rejects full namespace prefix (suffix only)', () => {
    expect(validateDemoKeySuffix(`${DEMO_REDIS_NAMESPACE}foo`)).toMatch(/suffix only/)
  })

  it('accepts valid suffix', () => {
    expect(validateDemoKeySuffix('my-key_1')).toBeNull()
  })
})

describe('validateDemoValue', () => {
  it('requires value and max length', () => {
    expect(validateDemoValue('')).toBe('Value is required.')
    expect(validateDemoValue('x'.repeat(1025))).toMatch(/at most/)
    expect(validateDemoValue('ok')).toBeNull()
  })
})

describe('validateOptionalTtl', () => {
  it('allows empty TTL', () => {
    expect(validateOptionalTtl('')).toEqual({ ok: true })
  })

  it('parses positive integer seconds within cap', () => {
    expect(validateOptionalTtl('60')).toEqual({ ok: true, value: 60 })
    expect(validateOptionalTtl(String(DEMO_TTL_MAX_SECONDS + 1))).toMatchObject({ ok: false })
    expect(validateOptionalTtl('1.5')).toMatchObject({ ok: false })
  })
})

describe('validateDemoBucket', () => {
  it('allows empty bucket', () => {
    expect(validateDemoBucket('')).toBeNull()
  })

  it('validates pattern and length when provided', () => {
    expect(validateDemoBucket('bad space')).toMatch(/letters, numbers/)
    expect(validateDemoBucket('valid-bucket')).toBeNull()
  })
})

describe('formatTtl', () => {
  it('formats null, seconds, and minutes', () => {
    expect(formatTtl(null)).toBe('No expiry')
    expect(formatTtl(-1)).toBe('Unknown')
    expect(formatTtl(45)).toBe('45s')
    expect(formatTtl(120)).toBe('2m')
    expect(formatTtl(125)).toBe('2m 5s')
  })
})
