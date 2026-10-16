'use client'

import { useQuery } from '@tanstack/react-query'
import { ArrowRight, RefreshCw } from 'lucide-react'
import * as React from 'react'

import { ActionError } from '@/components/playground/action-error'
import { EnqueueForm } from '@/components/queues/enqueue-form'
import { JobStateBadge } from '@/components/queues/job-state-badge'
import { MetricsPanel } from '@/components/queues/metrics-panel'
import { StudioShell } from '@/components/queues/studio-shell'
import { AppLink } from '@/components/app-link'
import { ActionIcon } from '@/components/ui/action-icon'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { Skeleton } from '@/components/ui/skeleton'
import { useQueueEvents } from '@/hooks/use-queue-events'
import { defaultDemoQueue, listQueueJobs } from '@/lib/api/queues'
import { queueQueryKeys } from '@/lib/query-client'

export function JobsLab() {
  const queue = defaultDemoQueue()
  const live = useQueueEvents(queue, true)

  const jobsQuery = useQuery({
    queryKey: queueQueryKeys.jobs(queue),
    queryFn: ({ signal }) => listQueueJobs(queue, { signal }),
  })

  return (
    <StudioShell
      title="Jobs"
      lead="Enqueue allowlisted demo jobs and watch waiting, active, delayed, completed, and failed."
      highlight="waiting, active, delayed, completed, and failed"
    >
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Live updates</span>
        <Chip
          tone={
            live.mode === 'sse' ? 'success' : live.mode === 'polling' ? 'special' : 'default'
          }
        >
          {live.mode === 'sse'
            ? 'SSE'
            : live.mode === 'polling'
              ? 'Polling fallback'
              : live.mode === 'error'
                ? 'Error'
                : 'Idle'}
        </Chip>
        {live.error ? <span className="text-xs text-muted-foreground">{live.error}</span> : null}
        {live.lastEvent ? (
          <span className="text-xs text-muted-foreground">
            Last: {live.lastEvent.type}
            {typeof live.lastEvent.data.jobId === 'string'
              ? ` · ${live.lastEvent.data.jobId}`
              : ''}
          </span>
        ) : null}
      </div>

      <MetricsPanel queue={queue} />

      <div className="grid gap-6 lg:grid-cols-2">
        <EnqueueForm queue={queue} />

        <section aria-labelledby="job-list-heading" className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 id="job-list-heading" className="font-montserrat text-sm font-semibold">
              Recent jobs
            </h3>
            <ActionIcon
              label={jobsQuery.isFetching ? 'Refreshing…' : 'Refresh'}
              onClick={() => void jobsQuery.refetch()}
              disabled={jobsQuery.isFetching}
            >
              <RefreshCw className={jobsQuery.isFetching ? 'motion-safe:animate-spin' : undefined} />
            </ActionIcon>
          </div>

          {jobsQuery.isPending ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : jobsQuery.isError ? (
            <ActionError error={jobsQuery.error} title="Could not load jobs" />
          ) : jobsQuery.data.jobs.length === 0 ? (
            <Alert tone="info" title="No jobs yet">
              Enqueue a demo job to populate this list.
            </Alert>
          ) : (
            <ul className="divide-y divide-card-edge rounded-xl border border-card-edge">
              {jobsQuery.data.jobs.map((job) => (
                <li
                  key={job.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 text-sm"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="font-mono text-xs">{job.id}</code>
                      <Chip>{job.name}</Chip>
                      <JobStateBadge state={job.state} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      attempts {job.attemptsMade}
                      {job.attemptsMax !== null ? `/${job.attemptsMax}` : ''}
                      {job.priority !== null ? ` · priority ${job.priority}` : ''}
                      {job.delay !== null && job.delay > 0 ? ` · delay ${job.delay}ms` : ''}
                    </p>
                  </div>
                  <Button variant="soft" size="sm" asChild iconRight={<ArrowRight />}>
                    <AppLink href={`/queues/jobs/detail?id=${encodeURIComponent(job.id)}`}>
                      Detail
                    </AppLink>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </StudioShell>
  )
}
