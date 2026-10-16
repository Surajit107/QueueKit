'use client'

import { ArrowRight } from 'lucide-react'

import { AppLink } from '@/components/app-link'
import { ResetDemoControl } from '@/components/playground/reset-demo-control'
import { EnqueueForm } from '@/components/queues/enqueue-form'
import { MetricsPanel } from '@/components/queues/metrics-panel'
import { StudioShell } from '@/components/queues/studio-shell'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardFooter, CardText, CardTitle } from '@/components/ui/card'
import { Chip } from '@/components/ui/chip'
import { useQueueEvents } from '@/hooks/use-queue-events'
import { defaultDemoQueue } from '@/lib/api/queues'

const LINKS = [
  {
    title: 'Jobs',
    description: 'List lifecycle states and open job detail with payload, attempts, and results.',
    href: '/queues/jobs',
    chips: ['Lifecycle', 'SSE'],
  },
  {
    title: 'Workers',
    description: 'Honest active / unknown / offline from status, plus documented concurrency.',
    href: '/queues/workers',
    chips: ['Health'],
  },
] as const

export function QueueStudioHome() {
  const queue = defaultDemoQueue()
  const live = useQueueEvents(queue, true)

  return (
    <StudioShell
      title="Queue Studio"
      lead="Enqueue allowlisted demo jobs and inspect BullMQ lifecycle state."
      highlight="BullMQ lifecycle state"
    >
      <Alert tone="info" title={`Demo queue: ${queue}`}>
        Pause and resume are not exposed by the API — those controls are omitted rather than faked.
        Clearing jobs uses the namespaced demo reset (Redis + allowlisted queues).
      </Alert>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Live</span>
        <Chip tone={live.mode === 'sse' ? 'success' : live.mode === 'polling' ? 'special' : 'default'}>
          {live.mode === 'sse' ? 'SSE connected' : live.mode === 'polling' ? 'Polling' : live.mode}
        </Chip>
      </div>

      <MetricsPanel queue={queue} />

      <div className="grid gap-6 lg:grid-cols-2">
        <EnqueueForm queue={queue} />
        <div className="grid gap-4">
          {LINKS.map((link) => (
            <Card key={link.href}>
              <CardBody>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {link.chips.map((chip) => (
                    <Chip key={chip}>{chip}</Chip>
                  ))}
                </div>
                <CardTitle>{link.title}</CardTitle>
                <CardText className="line-clamp-none">{link.description}</CardText>
                <CardFooter>
                  <Button variant="soft" size="sm" asChild iconRight={<ArrowRight />}>
                    <AppLink href={link.href}>Open</AppLink>
                  </Button>
                </CardFooter>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>

      <section
        aria-labelledby="queue-reset-heading"
        className="rounded-xl border border-card-edge px-4 py-4 sm:px-5"
      >
        <h2 id="queue-reset-heading" className="sr-only">
          Reset demo queue data
        </h2>
        <Alert tone="warning" title="Clean = full demo reset" className="mb-4">
          There is no per-queue “clean completed” endpoint. Reset obliterates allowlisted demo queues
          and namespaced Redis keys after confirmation.
        </Alert>
        <ResetDemoControl />
      </section>
    </StudioShell>
  )
}
