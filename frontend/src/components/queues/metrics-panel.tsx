'use client'

import { useQuery } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'

import { DataSourceChip } from '@/components/docs/data-source-label'
import { ActionError } from '@/components/playground/action-error'
import { ActionIcon } from '@/components/ui/action-icon'
import { Card, CardBody, CardText, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getQueueMetrics } from '@/lib/api/queues'
import { queueQueryKeys } from '@/lib/query-client'

export function MetricsPanel({ queue }: { queue: string }) {
  const query = useQuery({
    queryKey: queueQueryKeys.metrics(queue),
    queryFn: ({ signal }) => getQueueMetrics(queue, signal),
    refetchInterval: 15_000,
  })

  return (
    <Card>
      <CardBody className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Queue metrics</CardTitle>
            <DataSourceChip source="live-api" />
          </div>
          <ActionIcon
            label={query.isFetching ? 'Refreshing…' : 'Refresh metrics'}
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
          >
            <RefreshCw className={query.isFetching ? 'motion-safe:animate-spin' : undefined} />
          </ActionIcon>
        </div>
        <CardText className="line-clamp-none">
          Live counts from the API for <code className="font-mono text-xs">{queue}</code>. Duration
          and failure-rate series are not exposed. This panel does not invent them.
        </CardText>

        {query.isPending ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : query.isError ? (
          <ActionError error={query.error} title="Metrics unavailable" />
        ) : (
          <dl className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            <Metric label="Waiting" value={query.data.waiting} />
            <Metric label="Active" value={query.data.active} />
            <Metric label="Delayed" value={query.data.delayed} />
            <Metric label="Completed" value={query.data.completed} />
            <Metric label="Failed" value={query.data.failed} />
            <Metric label="Paused" value={query.data.paused} />
          </dl>
        )}
      </CardBody>
    </Card>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-card-edge px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-montserrat text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  )
}
