import { QueryClient } from '@tanstack/react-query'

/**
 * Demo-oriented Query defaults: limited retries, short stale windows,
 * no aggressive refetch that hammers a free-tier API.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 10_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 0,
      },
    },
  })
}

export const statusQueryKeys = {
  all: ['status'] as const,
  system: () => [...statusQueryKeys.all, 'system'] as const,
}

export const redisQueryKeys = {
  all: ['redis'] as const,
  keys: () => [...redisQueryKeys.all, 'keys'] as const,
  key: (key: string) => [...redisQueryKeys.all, 'key', key] as const,
}

export const queueQueryKeys = {
  all: ['queues'] as const,
  queue: (queue: string) => [...queueQueryKeys.all, queue] as const,
  jobs: (queue: string) => [...queueQueryKeys.queue(queue), 'jobs'] as const,
  job: (queue: string, jobId: string) =>
    [...queueQueryKeys.queue(queue), 'job', jobId] as const,
  metrics: (queue: string) => [...queueQueryKeys.queue(queue), 'metrics'] as const,
}
