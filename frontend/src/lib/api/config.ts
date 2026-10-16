/**
 * Public API origin from Next env. Trailing slashes are stripped.
 * Returns null when unset — UI must show a clear config error, never invent health.
 */
export function resolveApiBaseUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_QUEUEKIT_API_URL?.trim()
  if (!raw) {
    return null
  }
  return raw.replace(/\/+$/, '')
}

export function buildApiUrl(path: string, baseUrl = resolveApiBaseUrl()): string | null {
  if (!baseUrl) {
    return null
  }
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl}${normalizedPath}`
}
