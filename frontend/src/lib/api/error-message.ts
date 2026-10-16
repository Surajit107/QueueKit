import { isApiClientError } from '@/lib/api/errors'

/** Safe, user-facing message from an unknown failure. */
export function getErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (isApiClientError(error)) {
    return error.message
  }
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}
