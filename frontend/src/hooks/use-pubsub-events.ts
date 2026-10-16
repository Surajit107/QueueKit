'use client'

import type { DemoPubSubChannel } from '@queuekit/shared'
import * as React from 'react'

import {
  buildPubSubEventsUrl,
  parsePubSubSseMessage,
  type PubSubSseMessage,
} from '@/lib/api/pubsub'

export type PubSubConnectionState = 'idle' | 'connecting' | 'connected' | 'error' | 'closed'

const MAX_FEED = 50

/**
 * EventSource client for Redis Pub/Sub SSE.
 * Closes the stream on unmount / stop — no leaked connections.
 */
export function usePubSubEvents(channels: DemoPubSubChannel[]) {
  const [state, setState] = React.useState<PubSubConnectionState>('idle')
  const [error, setError] = React.useState<string | null>(null)
  const [messages, setMessages] = React.useState<PubSubSseMessage[]>([])
  const [limitations, setLimitations] = React.useState<string[]>([])
  const sourceRef = React.useRef<EventSource | null>(null)

  const stop = React.useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.close()
      sourceRef.current = null
    }
    setState((prev) => (prev === 'idle' ? prev : 'closed'))
  }, [])

  const clearMessages = React.useCallback(() => {
    setMessages([])
  }, [])

  const start = React.useCallback(() => {
    stop()
    setError(null)
    setMessages([])

    const url = buildPubSubEventsUrl(channels)
    if (!url) {
      setState('error')
      setError(
        'NEXT_PUBLIC_QUEUEKIT_API_URL is not set. Configure the public API origin to use Pub/Sub.',
      )
      return
    }

    setState('connecting')
    const source = new EventSource(url)
    sourceRef.current = source

    source.addEventListener('connected', (event) => {
      setState('connected')
      try {
        const payload = JSON.parse((event as MessageEvent).data) as {
          limitations?: unknown
        }
        if (Array.isArray(payload.limitations) && payload.limitations.every((n) => typeof n === 'string')) {
          setLimitations(payload.limitations)
        }
      } catch {
        /* ignore malformed connected payload */
      }
    })

    source.addEventListener('redis.pubsub.message', (event) => {
      try {
        const parsed = parsePubSubSseMessage(JSON.parse((event as MessageEvent).data))
        if (!parsed) {
          return
        }
        setMessages((prev) => [parsed, ...prev].slice(0, MAX_FEED))
      } catch {
        /* ignore malformed events */
      }
    })

    source.addEventListener('error', (event) => {
      if (event instanceof MessageEvent && typeof event.data === 'string') {
        try {
          const payload = JSON.parse(event.data) as { message?: string }
          if (payload.message) {
            setError(payload.message)
          }
        } catch {
          /* stream-level error */
        }
      }
    })

    source.onerror = () => {
      if (source.readyState === EventSource.CLOSED) {
        setState('closed')
        setError((prev) => prev ?? 'Pub/Sub stream closed.')
        sourceRef.current = null
        return
      }
      setState('error')
      setError('Pub/Sub stream interrupted. Redis may be unavailable or the API is unreachable.')
    }
  }, [channels, stop])

  React.useEffect(() => () => stop(), [stop])

  return {
    state,
    error,
    messages,
    limitations,
    start,
    stop,
    clearMessages,
    isListening: state === 'connected' || state === 'connecting',
  }
}
