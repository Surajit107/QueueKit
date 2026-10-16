'use client'

import { useQuery } from '@tanstack/react-query'

import { fetchSystemStatus, mapSystemStatusToView } from '@/lib/api'
import { statusQueryKeys } from '@/lib/query-client'

const STATUS_REFETCH_MS = 15_000

/**
 * Live system status query. Polls every 15s; UI maps failures to honest unknown/offline.
 */
export function useSystemStatus() {
  const query = useQuery({
    queryKey: statusQueryKeys.system(),
    queryFn: ({ signal }) => fetchSystemStatus(signal),
    refetchInterval: STATUS_REFETCH_MS,
    refetchIntervalInBackground: false,
  })

  const view = mapSystemStatusToView({
    data: query.data,
    error: query.error,
    isPending: query.isPending,
    isFetching: query.isFetching,
    isError: query.isError,
  })

  return {
    ...query,
    view,
  }
}
