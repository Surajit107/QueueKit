'use client'

import { ErrorCode } from '@queuekit/shared'
import { useMutation } from '@tanstack/react-query'
import { Gauge } from 'lucide-react'
import * as React from 'react'

import { DataSourceChip } from '@/components/docs/data-source-label'
import { ActionError } from '@/components/playground/action-error'
import { LabShell } from '@/components/playground/lab-shell'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardText, CardTitle } from '@/components/ui/card'
import { Chip } from '@/components/ui/chip'
import { Input } from '@/components/ui/input'
import {
  isApiClientError,
  parseRateLimitDenial,
  runRateLimitDemo,
  type RateLimitDemoResult,
} from '@/lib/api'
import { validateDemoBucket } from '@/lib/redis-demo'

export function LimitsLab() {
  const [bucket, setBucket] = React.useState('default')
  const [limit, setLimit] = React.useState('5')
  const [windowMs, setWindowMs] = React.useState('60000')
  const [formError, setFormError] = React.useState<string | null>(null)
  const [outcome, setOutcome] = React.useState<RateLimitDemoResult | null>(null)
  const [unexpectedError, setUnexpectedError] = React.useState<unknown>(null)

  const mutation = useMutation({
    mutationFn: (input: Parameters<typeof runRateLimitDemo>[0]) => runRateLimitDemo(input),
    onMutate: () => {
      setUnexpectedError(null)
      setFormError(null)
    },
    onSuccess: (result) => {
      setOutcome(result)
    },
    onError: (error, variables) => {
      if (isApiClientError(error) && error.code === ErrorCode.RATE_LIMITED) {
        const denied = parseRateLimitDenial(
          error.details,
          variables?.bucket ?? 'default',
        )
        if (denied) {
          setOutcome(denied)
          return
        }
      }
      setOutcome(null)
      setUnexpectedError(error)
    },
  })

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const bucketError = validateDemoBucket(bucket)
    if (bucketError) {
      setFormError(bucketError)
      return
    }

    const parsedLimit = Number(limit)
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 1000) {
      setFormError('Limit must be an integer from 1 to 1000.')
      return
    }

    const parsedWindow = Number(windowMs)
    if (!Number.isInteger(parsedWindow) || parsedWindow < 1000 || parsedWindow > 3_600_000) {
      setFormError('Window must be an integer from 1000 to 3600000 ms.')
      return
    }

    mutation.mutate({
      bucket: bucket.trim() || 'default',
      limit: parsedLimit,
      windowMs: parsedWindow,
    })
  }

  return (
    <LabShell
      title="Rate limits"
      lead="See allow versus deny with a clear scope and honest failure states."
      highlight="allow versus deny"
    >
      <Alert tone="info" title="Demo bucket scope">
        Requests consume <code className="font-mono text-xs">ratelimit:demo:{'{bucket}'}</code> under
        the demo namespace. A 429 with <code className="font-mono text-xs">RATE_LIMITED</code> is an
        expected deny outcome, not a crash.
      </Alert>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardBody className="gap-4">
            <CardTitle>Consume limit</CardTitle>
            <CardText className="line-clamp-none">
              Defaults match the API: limit 5 per 60s window on bucket <code className="font-mono text-xs">default</code>.
            </CardText>
            <form className="flex flex-col gap-3" onSubmit={onSubmit} noValidate>
              <Field label="Bucket" htmlFor="rl-bucket">
                <Input
                  id="rl-bucket"
                  value={bucket}
                  onChange={(e) => setBucket(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
              </Field>
              <Field label="Limit" htmlFor="rl-limit">
                <Input
                  id="rl-limit"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={1000}
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                />
              </Field>
              <Field label="Window (ms)" htmlFor="rl-window">
                <Input
                  id="rl-window"
                  type="number"
                  inputMode="numeric"
                  min={1000}
                  max={3_600_000}
                  value={windowMs}
                  onChange={(e) => setWindowMs(e.target.value)}
                />
              </Field>
              {formError ? (
                <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                  {formError}
                </p>
              ) : null}
              <Button
                type="submit"
                variant="solid"
                iconLeft={<Gauge />}
                iconRight={null}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? 'Checking…' : 'Consume'}
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>Last outcome</CardTitle>
              <DataSourceChip source="live-api" />
            </div>
            {!outcome ? (
              <CardText className="line-clamp-none">
                No consume yet. Allowed and denied results both render here from the API response.
              </CardText>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Chip tone={outcome.allowed ? 'success' : 'danger'}>
                    {outcome.allowed ? 'Allowed' : 'Denied'}
                  </Chip>
                  <Chip>bucket {outcome.bucket}</Chip>
                </div>
                <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <Stat label="Remaining" value={String(outcome.remaining)} />
                  <Stat label="Limit" value={String(outcome.limit)} />
                  <Stat label="Window" value={`${outcome.windowMs}ms`} />
                  <Stat
                    label="Retry after"
                    value={
                      outcome.retryAfterMs === null ? 'n/a' : `${outcome.retryAfterMs}ms`
                    }
                  />
                </dl>
                <CardText className="line-clamp-none">
                  {outcome.allowed
                    ? 'Request counted against the demo bucket.'
                    : 'Demo rate limit exceeded for this bucket and window.'}
                </CardText>
              </>
            )}
          </CardBody>
        </Card>
      </div>

      {unexpectedError ? (
        <ActionError error={unexpectedError} title="Rate-limit demo failed" />
      ) : null}
    </LabShell>
  )
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-card-edge px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-montserrat font-semibold tabular-nums">{value}</dd>
    </div>
  )
}
