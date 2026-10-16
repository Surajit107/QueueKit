'use client'

import { DemoJobTypeEnum, type DemoJobType } from '@queuekit/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ListPlus } from 'lucide-react'
import * as React from 'react'

import { DataSourceChip } from '@/components/docs/data-source-label'
import { ActionError } from '@/components/playground/action-error'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardText, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { enqueueQueueJob, type JobView } from '@/lib/api/queues'
import {
  DEMO_JOB_TYPES,
  JOB_TYPE_COPY,
  validateEnqueueForm,
} from '@/lib/queue-demo'
import { queueQueryKeys } from '@/lib/query-client'

export function EnqueueForm({
  queue,
  onEnqueued,
}: {
  queue: string
  onEnqueued?: (job: JobView) => void
}) {
  const queryClient = useQueryClient()
  const [type, setType] = React.useState<DemoJobType>(DemoJobTypeEnum.ECHO)
  const [message, setMessage] = React.useState('hello from QueueKit')
  const [waitMs, setWaitMs] = React.useState('250')
  const [failUntilAttempt, setFailUntilAttempt] = React.useState('99')
  const [delayMs, setDelayMs] = React.useState('')
  const [priority, setPriority] = React.useState('')
  const [formError, setFormError] = React.useState<string | null>(null)
  const [lastJob, setLastJob] = React.useState<JobView | null>(null)

  const mutation = useMutation({
    mutationFn: (body: NonNullable<Parameters<typeof enqueueQueueJob>[1]>) =>
      enqueueQueueJob(queue, body),
    onSuccess: async (job) => {
      setLastJob(job)
      setFormError(null)
      onEnqueued?.(job)
      await queryClient.invalidateQueries({ queryKey: queueQueryKeys.queue(queue) })
    },
  })

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = validateEnqueueForm({
      type,
      message,
      waitMs,
      failUntilAttempt,
      delayMs,
      priority,
    })
    if (!result.ok) {
      setFormError(result.error)
      return
    }
    setFormError(null)
    mutation.mutate(result.body)
  }

  return (
    <Card>
      <CardBody className="gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>Enqueue demo job</CardTitle>
          {type === DemoJobTypeEnum.FAIL ? <DataSourceChip source="simulated" /> : null}
        </div>
        <CardText className="line-clamp-none">
          Allowlisted types only. <code className="font-mono text-xs">delayMs</code> schedules the
          job; <code className="font-mono text-xs">fail</code> is a simulated failure path with
          server retry defaults (3 attempts, exponential backoff). There is no manual retry
          endpoint.
        </CardText>

        <form className="flex flex-col gap-3" onSubmit={onSubmit} noValidate>
          <Field label="Job type" htmlFor="job-type">
            <select
              id="job-type"
              value={type}
              onChange={(e) => setType(e.target.value as DemoJobType)}
              className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 dark:border-gray-800 dark:bg-black/50"
            >
              {DEMO_JOB_TYPES.map((jobType) => (
                <option key={jobType} value={jobType}>
                  {jobType}
                </option>
              ))}
            </select>
          </Field>
          <p className="text-xs text-muted-foreground">{JOB_TYPE_COPY[type]}</p>

          {(type === DemoJobTypeEnum.ECHO || type === DemoJobTypeEnum.FAIL) && (
            <Field label="Message" htmlFor="job-message">
              <Input
                id="job-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                autoComplete="off"
              />
            </Field>
          )}

          {type === DemoJobTypeEnum.DELAY && (
            <Field label="waitMs (processor sleep, 0–5000)" htmlFor="job-wait">
              <Input
                id="job-wait"
                type="number"
                inputMode="numeric"
                min={0}
                max={5_000}
                value={waitMs}
                onChange={(e) => setWaitMs(e.target.value)}
              />
            </Field>
          )}

          {type === DemoJobTypeEnum.FAIL && (
            <Field label="failUntilAttempt (optional)" htmlFor="job-fail-until">
              <Input
                id="job-fail-until"
                type="number"
                inputMode="numeric"
                min={1}
                max={99}
                value={failUntilAttempt}
                onChange={(e) => setFailUntilAttempt(e.target.value)}
              />
            </Field>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="BullMQ delayMs (optional, 0–60000)" htmlFor="job-delay">
              <Input
                id="job-delay"
                type="number"
                inputMode="numeric"
                min={0}
                max={60_000}
                value={delayMs}
                onChange={(e) => setDelayMs(e.target.value)}
                placeholder="immediate"
              />
            </Field>
            <Field label="Priority (optional, 1–10)" htmlFor="job-priority">
              <Input
                id="job-priority"
                type="number"
                inputMode="numeric"
                min={1}
                max={10}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              />
            </Field>
          </div>

          {formError ? (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {formError}
            </p>
          ) : null}

          <Button
            type="submit"
            variant="solid"
            iconLeft={<ListPlus />}
            iconRight={null}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Enqueueing…' : 'Enqueue'}
          </Button>
        </form>

        {lastJob ? (
          <Alert tone="success" title={`Enqueued ${lastJob.id}`}>
            State {lastJob.state} · type {lastJob.name}
          </Alert>
        ) : null}

        {mutation.isError ? <ActionError error={mutation.error} title="Enqueue failed" /> : null}
      </CardBody>
    </Card>
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
