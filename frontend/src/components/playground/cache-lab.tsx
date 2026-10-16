'use client'

import { useMutation } from '@tanstack/react-query'
import { Download, Eraser, RotateCcw } from 'lucide-react'
import * as React from 'react'

import { DataSourceChip } from '@/components/docs/data-source-label'
import { ActionError } from '@/components/playground/action-error'
import { LabShell } from '@/components/playground/lab-shell'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardText, CardTitle } from '@/components/ui/card'
import { Chip } from '@/components/ui/chip'
import { runCacheAsideDemo, type CacheAsideDemoResult } from '@/lib/api'

type SessionMetrics = {
  hits: number
  misses: number
  lastLatencyMs: number | null
  label: string | null
}

const INITIAL_METRICS: SessionMetrics = {
  hits: 0,
  misses: 0,
  lastLatencyMs: null,
  label: null,
}

export function CacheLab() {
  const [lastResult, setLastResult] = React.useState<CacheAsideDemoResult | null>(null)
  const [metrics, setMetrics] = React.useState<SessionMetrics>(INITIAL_METRICS)

  const mutation = useMutation({
    mutationFn: (forceMiss: boolean) => runCacheAsideDemo({ forceMiss }),
    onSuccess: (result) => {
      setLastResult(result)
      setMetrics((prev) => ({
        hits: prev.hits + (result.hit ? 1 : 0),
        misses: prev.misses + (result.hit ? 0 : 1),
        lastLatencyMs: result.latencyMs,
        label: result.metricsLabel,
      }))
    },
  })

  return (
    <LabShell
      title="Cache-aside"
      lead="Hit and miss paths with labeled demo metrics, not invented production numbers."
      highlight="labeled demo metrics"
    >
      <Alert tone="info" title="Fixed demo key">
        The API uses a single allowlisted cache key (<code className="font-mono text-xs">cache:demo:user:1</code>
        ). Force miss deletes that key before loading the mock source.
      </Alert>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardBody className="gap-4">
            <CardTitle>Run cache-aside</CardTitle>
            <CardText className="line-clamp-none">
              Load the mock user through the cache-aside helper. Repeat for a hit; force miss to
              reload from the source.
            </CardText>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="solid"
                iconLeft={<Download />}
                iconRight={null}
                disabled={mutation.isPending}
                onClick={() => mutation.mutate(false)}
              >
                {mutation.isPending ? 'Running…' : 'Load (allow hit)'}
              </Button>
              <Button
                variant="outline"
                iconLeft={<RotateCcw />}
                iconRight={null}
                disabled={mutation.isPending}
                onClick={() => mutation.mutate(true)}
              >
                Force miss
              </Button>
              <Button
                variant="ghost"
                iconLeft={<Eraser />}
                iconRight={null}
                disabled={mutation.isPending}
                onClick={() => {
                  setLastResult(null)
                  setMetrics(INITIAL_METRICS)
                  mutation.reset()
                }}
              >
                Clear session metrics
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Session demo metrics</CardTitle>
              <DataSourceChip source="demo-session" />
            </div>
            <CardText className="line-clamp-none">
              Counts accumulate in this browser session from API responses. They are not production
              SLOs.
            </CardText>
            <dl className="grid grid-cols-3 gap-3 text-sm">
              <Metric label="Hits" value={String(metrics.hits)} />
              <Metric label="Misses" value={String(metrics.misses)} />
              <Metric
                label="Last latency"
                value={metrics.lastLatencyMs === null ? '—' : `${metrics.lastLatencyMs}ms`}
              />
            </dl>
            {metrics.label ? (
              <p className="text-xs text-muted-foreground">{metrics.label}</p>
            ) : (
              <p className="text-xs text-muted-foreground">No runs yet in this session.</p>
            )}
          </CardBody>
        </Card>
      </div>

      {lastResult ? (
        <Card>
          <CardBody className="gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>Last result</CardTitle>
              <DataSourceChip source="live-api" />
              <Chip tone={lastResult.hit ? 'success' : 'special'}>
                {lastResult.hit ? 'Hit' : 'Miss'}
              </Chip>
              <Chip>TTL {lastResult.ttlSeconds === null ? 'none' : `${lastResult.ttlSeconds}s`}</Chip>
            </div>
            <CardText className="line-clamp-none">
              {lastResult.hit
                ? 'Value served from Redis cache.'
                : 'Value loaded from the mock source and stored in cache.'}
            </CardText>
            <pre className="overflow-x-auto rounded-lg border border-card-edge bg-black/5 p-3 font-mono text-xs dark:bg-white/5">
              {JSON.stringify(lastResult.value, null, 2)}
            </pre>
            <p className="text-xs text-muted-foreground">
              Latency {lastResult.latencyMs}ms · {lastResult.metricsLabel}
            </p>
          </CardBody>
        </Card>
      ) : null}

      {mutation.isError ? <ActionError error={mutation.error} title="Cache demo failed" /> : null}
    </LabShell>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-card-edge px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-montserrat text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  )
}
