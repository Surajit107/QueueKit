import type { ErrorCode } from '@queuekit/shared'

export type ApiClientErrorKind = 'config' | 'network' | 'http' | 'parse'

/**
 * Typed client failure. `status` is null for config/network/parse failures
 * before a reliable HTTP status exists.
 */
export class ApiClientError extends Error {
  readonly kind: ApiClientErrorKind
  readonly status: number | null
  readonly code: ErrorCode | undefined
  readonly details: unknown[]

  constructor(
    message: string,
    options: {
      kind: ApiClientErrorKind
      status?: number | null
      code?: ErrorCode
      details?: unknown[]
      cause?: unknown
    },
  ) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined)
    this.name = 'ApiClientError'
    this.kind = options.kind
    this.status = options.status ?? null
    this.code = options.code
    this.details = options.details ?? []
  }
}

export function isApiClientError(value: unknown): value is ApiClientError {
  return value instanceof ApiClientError
}
