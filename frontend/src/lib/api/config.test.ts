import { describe, it, expect, vi, beforeEach } from 'vitest'

import { buildApiUrl, resolveApiBaseUrl } from '@/lib/api/config'

describe('resolveApiBaseUrl', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns null when NEXT_PUBLIC_QUEUEKIT_API_URL is unset', () => {
    vi.stubEnv('NEXT_PUBLIC_QUEUEKIT_API_URL', '')
    expect(resolveApiBaseUrl()).toBeNull()
  })

  it('returns null when env is whitespace only', () => {
    vi.stubEnv('NEXT_PUBLIC_QUEUEKIT_API_URL', '   ')
    expect(resolveApiBaseUrl()).toBeNull()
  })

  it('strips trailing slashes from the configured origin', () => {
    vi.stubEnv('NEXT_PUBLIC_QUEUEKIT_API_URL', 'http://localhost:3001///')
    expect(resolveApiBaseUrl()).toBe('http://localhost:3001')
  })

  it('trims surrounding whitespace before normalizing', () => {
    vi.stubEnv('NEXT_PUBLIC_QUEUEKIT_API_URL', '  http://localhost:3001/  ')
    expect(resolveApiBaseUrl()).toBe('http://localhost:3001')
  })
})

describe('buildApiUrl', () => {
  it('returns null when base URL is missing', () => {
    expect(buildApiUrl('/api/v1/status', null)).toBeNull()
  })

  it('joins base URL with a leading-slash path', () => {
    expect(buildApiUrl('/api/v1/status', 'http://localhost:3001')).toBe(
      'http://localhost:3001/api/v1/status',
    )
  })

  it('prefixes a slash when path omits one', () => {
    expect(buildApiUrl('api/v1/status', 'http://localhost:3001')).toBe(
      'http://localhost:3001/api/v1/status',
    )
  })

  it('uses resolveApiBaseUrl when base is omitted', () => {
    vi.stubEnv('NEXT_PUBLIC_QUEUEKIT_API_URL', 'http://localhost:3001/')
    expect(buildApiUrl('/api/v1/events')).toBe('http://localhost:3001/api/v1/events')
  })
})
