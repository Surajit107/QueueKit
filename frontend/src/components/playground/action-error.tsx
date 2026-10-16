'use client'

import { Alert } from '@/components/ui/alert'
import { getErrorMessage, isApiClientError } from '@/lib/api'

export function ActionError({
  error,
  title = 'Action unavailable',
}: {
  error: unknown
  title?: string
}) {
  if (!error) {
    return null
  }

  const message = getErrorMessage(error)
  const hint = isApiClientError(error)
    ? error.kind === 'config'
      ? 'Set NEXT_PUBLIC_QUEUEKIT_API_URL and reload.'
      : error.kind === 'network'
        ? 'The API may be sleeping or unreachable. Retry after it wakes.'
        : error.code === 'DEPENDENCY_UNAVAILABLE'
          ? 'Redis is unavailable. Status stays honest — nothing was invented.'
          : null
    : null

  return (
    <Alert tone="danger" title={title}>
      <p>{message}</p>
      {hint ? <p className="mt-1 opacity-90">{hint}</p> : null}
    </Alert>
  )
}
