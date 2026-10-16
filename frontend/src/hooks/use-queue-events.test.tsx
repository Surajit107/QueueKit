import { DemoEventEnum } from '@queuekit/shared'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useQueueEvents } from '@/hooks/use-queue-events'
import { queueQueryKeys } from '@/lib/query-client'
import { MockEventSource } from '@/test/mock-event-source'
import { createTestQueryClient } from '@/test/render'

const demoQueue = 'queuekit-demo'

function dispatchRaw(source: MockEventSource, type: string, rawData: string) {
  const event = new MessageEvent(type, { data: rawData })
  const dispatch = (source as unknown as { dispatch: (t: string, e: Event) => void }).dispatch
  dispatch.call(source, type, event)
}

function createWrapper(queryClient = createTestQueryClient()) {
  return {
    queryClient,
    Wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  }
}

describe('useQueueEvents', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.stubEnv('NEXT_PUBLIC_QUEUEKIT_API_URL', 'http://localhost:3001')
    MockEventSource.install()
  })

  afterEach(() => {
    MockEventSource.reset()
    vi.useRealTimers()
  })

  it('connects to the allowlisted SSE events URL', async () => {
    const { Wrapper } = createWrapper()
    renderHook(() => useQueueEvents(demoQueue), { wrapper: Wrapper })

    await waitFor(() => expect(MockEventSource.instances.length).toBe(1))
    expect(MockEventSource.instances[0].url).toContain('/api/v1/events')
    expect(MockEventSource.instances[0].url).toContain('types=')
  })

  it('parses allowlisted job events for the active queue', async () => {
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useQueueEvents(demoQueue), { wrapper: Wrapper })

    await waitFor(() => expect(MockEventSource.instances.length).toBe(1))
    const source = MockEventSource.instances[0]

    act(() => {
      source.open()
      source.emit(DemoEventEnum.JOB_COMPLETED, {
        type: DemoEventEnum.JOB_COMPLETED,
        at: '2026-01-01T00:00:00.000Z',
        data: { queue: demoQueue, jobId: 'job-42' },
      })
    })

    await waitFor(() => expect(result.current.lastEvent?.data.jobId).toBe('job-42'))
  })

  it('ignores malformed payloads and events for other queues', async () => {
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useQueueEvents(demoQueue), { wrapper: Wrapper })

    await waitFor(() => expect(MockEventSource.instances.length).toBe(1))
    const source = MockEventSource.instances[0]

    act(() => {
      dispatchRaw(source, DemoEventEnum.JOB_WAITING, '{not-json')
      source.emit(DemoEventEnum.JOB_WAITING, {
        type: DemoEventEnum.JOB_WAITING,
        at: '2026-01-01T00:00:00.000Z',
        data: { queue: 'other-queue', jobId: 'skip-me' },
      })
    })

    expect(result.current.lastEvent).toBeNull()
  })

  it('falls back to polling when the socket closes and stops on connected or unmount', async () => {
    const { queryClient, Wrapper } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result, unmount } = renderHook(() => useQueueEvents(demoQueue), {
      wrapper: Wrapper,
    })

    await waitFor(() => expect(MockEventSource.instances.length).toBe(1))
    const source = MockEventSource.instances[0]

    act(() => {
      source.failClosed()
    })

    await waitFor(() => expect(result.current.mode).toBe('polling'))
    expect(result.current.error).toMatch(/polling/i)

    const afterFail = invalidateSpy.mock.calls.length

    act(() => {
      vi.advanceTimersByTime(5_000)
    })
    expect(invalidateSpy.mock.calls.length).toBeGreaterThan(afterFail)

    act(() => {
      source.open()
    })
    await waitFor(() => expect(result.current.mode).toBe('sse'))

    const afterConnected = invalidateSpy.mock.calls.length
    act(() => {
      vi.advanceTimersByTime(5_000)
    })
    expect(invalidateSpy.mock.calls.length).toBe(afterConnected)

    unmount()
    act(() => {
      vi.advanceTimersByTime(5_000)
    })
    expect(invalidateSpy.mock.calls.length).toBe(afterConnected)
  })

  it('invalidates queue and job queries when a matching event arrives', async () => {
    const { queryClient, Wrapper } = createWrapper()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    renderHook(() => useQueueEvents(demoQueue), { wrapper: Wrapper })

    await waitFor(() => expect(MockEventSource.instances.length).toBe(1))
    const source = MockEventSource.instances[0]

    act(() => {
      source.emit(DemoEventEnum.JOB_ACTIVE, {
        type: DemoEventEnum.JOB_ACTIVE,
        at: '2026-01-01T00:00:00.000Z',
        data: { queue: demoQueue, jobId: 'job-7' },
      })
    })

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queueQueryKeys.job(demoQueue, 'job-7'),
      }),
    )
  })
})
