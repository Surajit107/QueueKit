'use client'

import { RefreshCw } from 'lucide-react'

import { DataSourceChip } from '@/components/docs/data-source-label'
import { StudioShell } from '@/components/queues/studio-shell'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardText, CardTitle } from '@/components/ui/card'
import { Chip } from '@/components/ui/chip'
import { LiveDot } from '@/components/ui/live-dot'
import { Skeleton } from '@/components/ui/skeleton'
import { useSystemStatus } from '@/hooks/use-system-status'
import { DEMO_WORKER_CONCURRENCY } from '@/lib/queue-demo'
import { defaultDemoQueue } from '@/lib/api/queues'

export function WorkersLab() {
  const { data, isPending, isError, view, refetch, isFetching } = useSystemStatus()
  const workerRow = view.services.find((s) => s.id === 'worker')
  const queue = defaultDemoQueue()

  return (
    <StudioShell
      title="Workers"
      lead="Concurrency and last-reported health without fabricating online status."
      highlight="without fabricating online status"
    >
      <Alert tone="info" title="No dedicated workers route">
        Worker health comes from <code className="font-mono text-xs">GET /api/v1/status</code>.
        Concurrency is the toolkit default ({DEMO_WORKER_CONCURRENCY}), not remotely configurable
        via the public API.
      </Alert>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardBody className="gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>Worker health</CardTitle>
                <DataSourceChip source="live-api" />
              </div>
              {isPending ? (
                <Skeleton className="h-5 w-20" />
              ) : workerRow?.status === 'healthy' ? (
                <LiveDot tone="success">Active</LiveDot>
              ) : (
                <Chip
                  tone={
                    workerRow?.status === 'offline'
                      ? 'danger'
                      : workerRow?.status === 'reconnecting'
                        ? 'special'
                        : 'default'
                  }
                  aria-label={`Worker: ${workerRow ? workerRow.status : 'unknown'}`}
                >
                  {workerRow
                    ? workerRow.status.charAt(0).toUpperCase() + workerRow.status.slice(1)
                    : 'Unknown'}
                </Chip>
              )}
            </div>
            <CardText className="line-clamp-none">
              {isPending
                ? 'Checking status…'
                : workerRow?.detail ?? 'Worker status unknown until the API answers.'}
            </CardText>
            {data?.workerHeartbeatAt ? (
              <p className="text-xs text-muted-foreground">
                Last heartbeat: {new Date(data.workerHeartbeatAt).toLocaleString()}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">No heartbeat timestamp reported.</p>
            )}
            <Button
              variant="ghost"
              size="sm"
              iconLeft={<RefreshCw className={isFetching ? 'motion-safe:animate-spin' : undefined} />}
              iconRight={null}
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              {isFetching ? 'Refreshing…' : 'Refresh status'}
            </Button>
            {isError ? (
              <p className="text-xs text-red-600 dark:text-red-400" role="status">
                Status poll failed — values stay unknown/offline honestly.
              </p>
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardBody className="gap-3">
            <CardTitle>Concurrency</CardTitle>
            <p className="font-montserrat text-3xl font-semibold tabular-nums">
              {DEMO_WORKER_CONCURRENCY}
            </p>
            <CardText className="line-clamp-none">
              Documented demo default for queue{' '}
              <code className="font-mono text-xs">{queue}</code>. The API does not expose a
              concurrency control endpoint, so this UI does not pretend to change it.
            </CardText>
          </CardBody>
        </Card>
      </div>
    </StudioShell>
  )
}
