import type { ApiSuccessBody, ErrorCode, PublicErrorBody } from '@queuekit/shared'

import { buildApiUrl } from '@/lib/api/config'
import { ApiClientError } from '@/lib/api/errors'

export type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
  signal?: AbortSignal
}

/**
 * Typed JSON fetch against the QueueKit API.
 * Maps network / non-2xx / malformed bodies to ApiClientError — never invents payload fields.
 */
export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const url = buildApiUrl(path)
  if (!url) {
    throw new ApiClientError(
      'NEXT_PUBLIC_QUEUEKIT_API_URL is not set. Add it to frontend/.env.local (see .env.example) and restart the Next.js dev server.',
      { kind: 'config' },
    )
  }

  const { body, headers, signal, ...rest } = options
  const requestHeaders = new Headers(headers)
  if (!requestHeaders.has('Accept')) {
    requestHeaders.set('Accept', 'application/json')
  }
  if (body !== undefined && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json')
  }

  let response: Response
  try {
    response = await fetch(url, {
      ...rest,
      signal,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (cause) {
    if (signal?.aborted) {
      throw cause
    }
    throw new ApiClientError('Unable to reach the QueueKit API.', {
      kind: 'network',
      cause,
    })
  }

  const payload = await readJsonBody(response)

  if (!response.ok) {
    const errorBody = asPublicErrorBody(payload)
    throw new ApiClientError(errorBody?.message ?? safeHttpMessage(response.status), {
      kind: 'http',
      status: response.status,
      code: errorBody?.code,
      details: errorBody?.errors ?? [],
    })
  }

  if (!isApiSuccessBody<T>(payload)) {
    throw new ApiClientError('API returned an unexpected success payload.', {
      kind: 'parse',
      status: response.status,
    })
  }

  return payload.data
}

async function readJsonBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) {
    return null
  }
  try {
    return JSON.parse(text) as unknown
  } catch (cause) {
    throw new ApiClientError('API returned a non-JSON response.', {
      kind: 'parse',
      status: response.status,
      cause,
    })
  }
}

function isApiSuccessBody<T>(value: unknown): value is ApiSuccessBody<T> {
  if (!isRecord(value)) {
    return false
  }
  return value.success === true && 'data' in value
}

function asPublicErrorBody(value: unknown): PublicErrorBody | null {
  if (!isRecord(value) || value.success !== false) {
    return null
  }
  if (typeof value.message !== 'string') {
    return null
  }
  return {
    statusCode: typeof value.statusCode === 'number' ? value.statusCode : 0,
    success: false,
    message: value.message,
    code: isErrorCode(value.code) ? value.code : undefined,
    errors: Array.isArray(value.errors) ? value.errors : [],
    data: null,
  }
}

function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === 'string'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function safeHttpMessage(status: number): string {
  if (status >= 500) {
    return 'The QueueKit API reported a server error.'
  }
  if (status === 404) {
    return 'The requested API resource was not found.'
  }
  if (status === 429) {
    return 'The QueueKit API rate-limited this request.'
  }
  return `The QueueKit API responded with HTTP ${status}.`
}
