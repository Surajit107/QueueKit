import { describe, it, expect } from 'vitest'
import type { SystemStatus } from '@queuekit/shared'

import { mapSystemStatusToView } from '@/lib/api/map-status'
import { ApiClientError } from '@/lib/api/errors'

const baseStatus: SystemStatus = {
  api: 'ok',
  redis: 'connected',
  worker: 'active',
  workerHeartbeatAt: null,
  notes: [],
}

function serviceStatus(id: 'api' | 'redis' | 'worker') {
  return mapSystemStatusToView({
    data: baseStatus,
    error: null,
    isPending: false,
    isFetching: false,
    isError: false,
  }).services.find((row) => row.id === id)?.status
}

describe('mapSystemStatusToView', () => {
  it('pending without data keeps redis/worker unknown (never healthy)', () => {
    const view = mapSystemStatusToView({
      data: undefined,
      error: null,
      isPending: true,
      isFetching: true,
      isError: false,
    })

    expect(view.services.map((s) => s.status)).toEqual(['unknown', 'unknown', 'unknown'])
    expect(view.services.find((s) => s.id === 'redis')?.detail).toMatch(/Waiting for a confirmed/)
  })

  it('config error without data marks redis unknown, not healthy', () => {
    const error = new ApiClientError('Missing API URL', { kind: 'config' })
    const view = mapSystemStatusToView({
      data: undefined,
      error,
      isPending: false,
      isFetching: false,
      isError: true,
    })

    const redis = view.services.find((s) => s.id === 'redis')
    expect(redis?.status).toBe('unknown')
    expect(redis?.detail).toMatch(/API URL is configured/)
  })

  it('network error without data does not invent redis healthy', () => {
    const error = new ApiClientError('Unable to reach the QueueKit API.', { kind: 'network' })
    const view = mapSystemStatusToView({
      data: undefined,
      error,
      isPending: false,
      isFetching: false,
      isError: true,
    })

    expect(view.services.find((s) => s.id === 'redis')?.status).toBe('unknown')
    expect(view.services.find((s) => s.id === 'api')?.status).toBe('offline')
  })

  it('reconnecting sets redis to reconnecting, not healthy', () => {
    const view = mapSystemStatusToView({
      data: baseStatus,
      error: new ApiClientError('fail', { kind: 'network' }),
      isPending: false,
      isFetching: true,
      isError: true,
    })

    expect(view.reconnecting).toBe(true)
    expect(view.services.find((s) => s.id === 'redis')?.status).toBe('reconnecting')
  })

  it('healthy poll maps connected redis to healthy', () => {
    expect(serviceStatus('api')).toBe('healthy')
    expect(serviceStatus('redis')).toBe('healthy')
    expect(serviceStatus('worker')).toBe('healthy')
  })

  it('maps redis unknown dependency without upgrading to healthy', () => {
    const view = mapSystemStatusToView({
      data: { ...baseStatus, redis: 'unknown' },
      error: null,
      isPending: false,
      isFetching: false,
      isError: false,
    })

    expect(view.services.find((s) => s.id === 'redis')?.status).toBe('unknown')
  })

  it('stale-after-error degrades API only; redis keeps last mapped value', () => {
    const view = mapSystemStatusToView({
      data: { ...baseStatus, redis: 'disconnected' },
      error: new ApiClientError('poll failed', { kind: 'http', status: 500 }),
      isPending: false,
      isFetching: false,
      isError: true,
    })

    expect(view.services.find((s) => s.id === 'api')?.status).toBe('degraded')
    expect(view.services.find((s) => s.id === 'redis')?.status).toBe('offline')
  })
})
