import type { SystemStatus } from '@queuekit/shared'
import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { useSystemStatus } from '@/hooks/use-system-status'
import { ApiClientError } from '@/lib/api/errors'
import { createTestQueryClient } from '@/test/render'

const fetchSystemStatus = vi.fn<(signal?: AbortSignal) => Promise<SystemStatus>>()

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    fetchSystemStatus: (signal?: AbortSignal) => fetchSystemStatus(signal),
  }
})

const healthyPayload: SystemStatus = {
  api: 'ok',
  redis: 'connected',
  worker: 'active',
  workerHeartbeatAt: '2026-01-01T00:00:00.000Z',
  notes: ['Demo note'],
}

function createWrapper() {
  const queryClient = createTestQueryClient()
  return {
    queryClient,
    Wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  }
}

describe('useSystemStatus', () => {
  beforeEach(() => {
    fetchSystemStatus.mockReset()
  })

  it('maps a pending query to unknown service rows', () => {
    fetchSystemStatus.mockReturnValue(new Promise(() => {}))
    const { Wrapper } = createWrapper()

    const { result } = renderHook(() => useSystemStatus(), { wrapper: Wrapper })

    expect(result.current.isPending).toBe(true)
    expect(result.current.view.services).toEqual([
      expect.objectContaining({ id: 'api', status: 'unknown', detail: expect.stringContaining('Checking') }),
      expect.objectContaining({ id: 'redis', status: 'unknown' }),
      expect.objectContaining({ id: 'worker', status: 'unknown' }),
    ])
  })

  it('maps fetch failures to offline API and unknown dependencies', async () => {
    fetchSystemStatus.mockRejectedValue(
      new ApiClientError('Network down', { kind: 'network' }),
    )
    const { Wrapper } = createWrapper()

    const { result } = renderHook(() => useSystemStatus(), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.view.services).toEqual([
      expect.objectContaining({ id: 'api', status: 'offline' }),
      expect.objectContaining({ id: 'redis', status: 'unknown' }),
      expect.objectContaining({ id: 'worker', status: 'unknown' }),
    ])
  })

  it('maps a successful payload to healthy service rows and notes', async () => {
    fetchSystemStatus.mockResolvedValue(healthyPayload)
    const { Wrapper } = createWrapper()

    const { result } = renderHook(() => useSystemStatus(), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.view.notes).toEqual(['Demo note'])
    expect(result.current.view.services).toEqual([
      expect.objectContaining({ id: 'api', status: 'healthy' }),
      expect.objectContaining({ id: 'redis', status: 'healthy' }),
      expect.objectContaining({ id: 'worker', status: 'healthy' }),
    ])
  })
})
