'use client'

import { useQueryClient } from '@tanstack/react-query'
import * as React from 'react'

import {
  buildJobEventsUrl,
  parseJobSsePayload,
  type JobSsePayload,
} from '@/lib/api/events'
import { queueQueryKeys } from '@/lib/query-client'

export type QueueLiveMode = 'sse' | 'polling' | 'idle' | 'error'

const POLL_MS = 5_000

/**
 * Job lifecycle live updates: prefer SSE, fall back to polling jobs/metrics.
 * Intentional close does not trip the error/polling path (avoids Strict Mode noise).
 */
export function useQueueEvents(queue: string, enabled = true) {
  const queryClient = useQueryClient()
  const [mode, setMode] = React.useState<QueueLiveMode>('idle')
  const [lastEvent, setLastEvent] = React.useState<JobSsePayload | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [generation, setGeneration] = React.useState(0)

  const sourceRef = React.useRef<EventSource | null>(null)
  const pollRef = React.useRef<ReturnType<typeof setInterval> | null>(null)
  const intentionalCloseRef = React.useRef(false)
  const queueRef = React.useRef(queue)
  queueRef.current = queue

  const invalidateQueue = React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queueQueryKeys.queue(queueRef.current) })
  }, [queryClient])

  const stopPolling = React.useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const startPolling = React.useCallback(() => {
    stopPolling()
    setMode('polling')
    invalidateQueue()
    pollRef.current = setInterval(() => {
      invalidateQueue()
    }, POLL_MS)
  }, [invalidateQueue, stopPolling])

  const stopSse = React.useCallback(() => {
    intentionalCloseRef.current = true
    if (sourceRef.current) {
      sourceRef.current.close()
      sourceRef.current = null
    }
  }, [])

  React.useEffect(() => {
    if (!enabled) {
      stopSse()
      stopPolling()
      setMode('idle')
      return
    }

    stopSse()
    stopPolling()
    setError(null)

    const url = buildJobEventsUrl()
    if (!url) {
      setMode('error')
      setError('NEXT_PUBLIC_QUEUEKIT_API_URL is not set.')
      startPolling()
      return () => {
        stopSse()
        stopPolling()
      }
    }

    intentionalCloseRef.current = false
    setMode('sse')
    const source = new EventSource(url)
    sourceRef.current = source

    const onJobEvent = (event: Event) => {
      try {
        const parsed = parseJobSsePayload(JSON.parse((event as MessageEvent).data))
        if (!parsed) return
        const eventQueue = typeof parsed.data.queue === 'string' ? parsed.data.queue : null
        if (eventQueue && eventQueue !== queueRef.current) return
        setLastEvent(parsed)
        invalidateQueue()
        if (typeof parsed.data.jobId === 'string') {
          void queryClient.invalidateQueries({
            queryKey: queueQueryKeys.job(queueRef.current, parsed.data.jobId),
          })
        }
      } catch {
        /* ignore malformed */
      }
    }

    for (const type of ['job.waiting', 'job.active', 'job.completed', 'job.failed'] as const) {
      source.addEventListener(type, onJobEvent)
    }

    source.addEventListener('connected', () => {
      setMode('sse')
      setError(null)
      stopPolling()
    })

    source.onerror = () => {
      if (intentionalCloseRef.current) {
        return
      }
      // Ignore transient CONNECTING errors; only fall back when the socket is closed.
      if (source.readyState !== EventSource.CLOSED) {
        return
      }
      sourceRef.current = null
      setError('SSE unavailable — polling jobs and metrics instead.')
      startPolling()
    }

    return () => {
      stopSse()
      stopPolling()
    }
  }, [enabled, generation, invalidateQueue, queryClient, startPolling, stopPolling, stopSse])

  return {
    mode,
    lastEvent,
    error,
    restart: () => setGeneration((n) => n + 1),
    stop: () => {
      stopSse()
      stopPolling()
      setMode('idle')
    },
  }
}
