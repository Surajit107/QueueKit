import { describe, it, expect, vi, beforeEach } from 'vitest'

import { apiRequest } from '@/lib/api/client'
import { ApiClientError, isApiClientError } from '@/lib/api/errors'

const API_BASE = 'http://localhost:3001'

function jsonResponse(
  body: unknown,
  init: { ok?: boolean; status?: number } = {},
): Response {
  const ok = init.ok ?? true
  const status = init.status ?? (ok ? 200 : 500)
  return {
    ok,
    status,
    text: async () => (body === null ? '' : JSON.stringify(body)),
  } as Response
}

describe('apiRequest', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_QUEUEKIT_API_URL', API_BASE)
  })

  it('returns parsed data on a successful JSON envelope', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ success: true, data: { id: 'job-1' } }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiRequest<{ id: string }>('/api/v1/status')).resolves.toEqual({
      id: 'job-1',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE}/api/v1/status`,
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    )
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const headers = init.headers as Headers
    expect(headers.get('Accept')).toBe('application/json')
  })

  it('throws config when NEXT_PUBLIC_QUEUEKIT_API_URL is missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_QUEUEKIT_API_URL', '')
    vi.stubGlobal('fetch', vi.fn())

    await expect(apiRequest('/api/v1/status')).rejects.toSatisfy((err: unknown) => {
      return (
        isApiClientError(err) &&
        err.kind === 'config' &&
        err.message.includes('NEXT_PUBLIC_QUEUEKIT_API_URL')
      )
    })
  })

  it('maps fetch failures to network ApiClientError', async () => {
    const cause = new TypeError('Failed to fetch')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(cause))

    await expect(apiRequest('/api/v1/status')).rejects.toSatisfy((err: unknown) => {
      return (
        isApiClientError(err) &&
        err.kind === 'network' &&
        err.message === 'Unable to reach the QueueKit API.'
      )
    })
  })

  it('rethrows when the request was aborted', async () => {
    const cause = new DOMException('Aborted', 'AbortError')
    const controller = new AbortController()
    controller.abort()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(cause))

    await expect(
      apiRequest('/api/v1/status', { signal: controller.signal }),
    ).rejects.toBe(cause)
  })

  it('maps non-2xx responses to http with server-safe message when body lacks message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ success: false }, { ok: false, status: 503 })),
    )

    await expect(apiRequest('/api/v1/status')).rejects.toSatisfy((err: unknown) => {
      return (
        isApiClientError(err) &&
        err.kind === 'http' &&
        err.status === 503 &&
        err.message === 'The QueueKit API reported a server error.'
      )
    })
  })

  it('uses PublicErrorBody message on non-2xx when present', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(
          { success: false, message: 'Rate limited', statusCode: 429 },
          { ok: false, status: 429 },
        ),
      ),
    )

    await expect(apiRequest('/api/v1/status')).rejects.toSatisfy((err: unknown) => {
      return isApiClientError(err) && err.kind === 'http' && err.message === 'Rate limited'
    })
  })

  it('throws parse when success body is malformed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ success: true }, { ok: true, status: 200 })),
    )

    await expect(apiRequest('/api/v1/status')).rejects.toSatisfy((err: unknown) => {
      return (
        isApiClientError(err) &&
        err.kind === 'parse' &&
        err.message === 'API returned an unexpected success payload.'
      )
    })
  })

  it('throws parse on non-JSON response text', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => 'not json',
      } as Response),
    )

    await expect(apiRequest('/api/v1/status')).rejects.toSatisfy((err: unknown) => {
      return isApiClientError(err) && err.kind === 'parse'
    })
  })

  it('JSON-stringifies POST body and sets Content-Type', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ success: true, data: { ok: true } }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await apiRequest('/api/v1/demo/reset', {
      method: 'POST',
      body: { confirm: true },
    })

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.body).toBe(JSON.stringify({ confirm: true }))
    const headers = init.headers as Headers
    expect(headers.get('Content-Type')).toBe('application/json')
  })
})

describe('ApiClientError', () => {
  it('exposes kind and optional status', () => {
    const err = new ApiClientError('test', { kind: 'http', status: 404 })
    expect(err.kind).toBe('http')
    expect(err.status).toBe(404)
  })
})
