'use client'

import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import * as React from 'react'

import { ActionError } from '@/components/playground/action-error'
import { JobStateBadge } from '@/components/queues/job-state-badge'
import { StudioShell } from '@/components/queues/studio-shell'
import { AppLink } from '@/components/app-link'
import { Alert } from '@/components/ui/alert'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardBody, CardText, CardTitle } from '@/components/ui/card'
import { Chip } from '@/components/ui/chip'
import { Skeleton } from '@/components/ui/skeleton'
import { useQueueEvents } from '@/hooks/use-queue-events'
import { defaultDemoQueue, getQueueJob } from '@/lib/api/queues'
import { queueQueryKeys } from '@/lib/query-client'
import { cn } from '@/lib/utils'

export function JobDetailLab() {
  const searchParams = useSearchParams()
  const jobId = searchParams.get('id')?.trim() || ''
  const queue = defaultDemoQueue()
  useQueueEvents(queue, Boolean(jobId))

  const query = useQuery({
    queryKey: queueQueryKeys.job(queue, jobId),
    queryFn: ({ signal }) => getQueueJob(queue, jobId, signal),
    enabled: Boolean(jobId),
  })

  return (
    <StudioShell
      title="Job detail"
      lead="Payload, attempts, timestamps, result, and sanitized errors from the API."
      highlight="sanitized errors"
    >
      <AppLink
        href="/queues/jobs"
        className={cn(buttonVariants({ variant: 'muted', size: 'sm' }), 'inline-flex items-center gap-1.5')}
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to jobs
      </AppLink>

      {!jobId ? (
        <Alert tone="warning" title="Missing job id">
          Open a job from the list. Static export uses{' '}
          <code className="font-mono text-xs">/queues/jobs/detail?id=…</code> instead of a dynamic
          path segment.
        </Alert>
      ) : query.isPending ? (
        <Skeleton className="h-48 w-full" />
      ) : query.isError ? (
        <ActionError error={query.error} title="Job unavailable" />
      ) : (
        <Card>
          <CardBody className="gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="font-mono text-base">{query.data.id}</CardTitle>
              <Chip>{query.data.name}</Chip>
              <JobStateBadge state={query.data.state} />
            </div>
            <CardText className="line-clamp-none">
              Queue <code className="font-mono text-xs">{query.data.queueName}</code>
            </CardText>

            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Stat
                label="Attempts"
                value={`${query.data.attemptsMade}${query.data.attemptsMax !== null ? ` / ${query.data.attemptsMax}` : ''}`}
              />
              <Stat
                label="Priority"
                value={query.data.priority === null ? '—' : String(query.data.priority)}
              />
              <Stat
                label="Delay"
                value={query.data.delay === null ? '—' : `${query.data.delay}ms`}
              />
              <Stat label="Created" value={formatTs(query.data.timestamp)} />
              <Stat label="Processed" value={formatTs(query.data.processedOn)} />
              <Stat label="Finished" value={formatTs(query.data.finishedOn)} />
            </dl>

            <Block title="Payload" value={query.data.data} />
            <Block title="Result" value={query.data.result} />

            {query.data.failedReason ? (
              <Alert tone="danger" title="Failed reason">
                {query.data.failedReason}
              </Alert>
            ) : null}

            <Button
              variant="ghost"
              size="sm"
              iconLeft={<RefreshCw className={query.isFetching ? 'motion-safe:animate-spin' : undefined} />}
              iconRight={null}
              onClick={() => void query.refetch()}
              disabled={query.isFetching}
            >
              {query.isFetching ? 'Refreshing…' : 'Refresh'}
            </Button>
          </CardBody>
        </Card>
      )}
    </StudioShell>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-card-edge px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-montserrat text-sm font-semibold break-all">{value}</dd>
    </div>
  )
}

function Block({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="space-y-1.5">
      <h3 className="font-montserrat text-sm font-semibold">{title}</h3>
      <pre className="overflow-x-auto rounded-lg border border-card-edge bg-black/5 p-3 font-mono text-xs dark:bg-white/5">
        {value === null || value === undefined
          ? 'null'
          : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  )
}

function formatTs(ms: number | null): string {
  if (ms === null) return '—'
  const date = new Date(ms)
  if (Number.isNaN(date.getTime())) return String(ms)
  return date.toLocaleString()
}
