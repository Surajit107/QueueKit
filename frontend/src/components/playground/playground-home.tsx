'use client'

import { ArrowRight } from 'lucide-react'

import { AppLink } from '@/components/app-link'
import { LabShell } from '@/components/playground/lab-shell'
import { ResetDemoControl } from '@/components/playground/reset-demo-control'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardFooter, CardText, CardTitle } from '@/components/ui/card'
import { Chip } from '@/components/ui/chip'

const LABS = [
  {
    title: 'Keys and TTL',
    description: 'Set, get, delete, and inspect allowlisted demo key suffixes with server-confirmed TTL.',
    href: '/playground/keys',
    chips: ['String', 'TTL'],
  },
  {
    title: 'Cache-aside',
    description: 'Run hit and miss paths against a fixed demo key. Metrics are labeled as demo only.',
    href: '/playground/cache',
    chips: ['Cache', 'Metrics'],
  },
  {
    title: 'Rate limits',
    description: 'Consume a bounded demo bucket and see allow versus deny with clear remaining counts.',
    href: '/playground/limits',
    chips: ['Counters', 'Limits'],
  },
  {
    title: 'Pub/Sub',
    description:
      'Real Redis PUBLISH / SUBSCRIBE on allowlisted channels, with honest fire-and-forget delivery.',
    href: '/playground/pubsub',
    chips: ['Publish', 'SSE'],
  },
] as const

export function PlaygroundHome() {
  return (
    <LabShell
      title="Redis Lab"
      lead="Interactive Redis demonstrations for keys, cache, rate limits, and pub/sub."
      highlight="keys, cache, rate limits, and pub/sub"
    >
      <Alert tone="info" title="Namespaced demo only">
        Keys and Pub/Sub channels are relative suffixes under the demo namespace. Arbitrary Redis
        commands are rejected. Pub/Sub messages are not durable.
      </Alert>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {LABS.map((lab) => (
          <Card key={lab.href}>
            <CardBody>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {lab.chips.map((chip) => (
                  <Chip key={chip}>{chip}</Chip>
                ))}
              </div>
              <CardTitle>{lab.title}</CardTitle>
              <CardText className="line-clamp-none">{lab.description}</CardText>
              <CardFooter>
                <Button variant="soft" size="sm" asChild iconRight={<ArrowRight />}>
                  <AppLink href={lab.href}>Open</AppLink>
                </Button>
              </CardFooter>
            </CardBody>
          </Card>
        ))}
      </div>

      <section
        aria-labelledby="reset-heading"
        className="rounded-xl border border-card-edge px-4 py-4 sm:px-5"
      >
        <h2 id="reset-heading" className="sr-only">
          Reset demo
        </h2>
        <ResetDemoControl />
      </section>
    </LabShell>
  )
}
