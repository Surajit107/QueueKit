import { ArrowRight } from 'lucide-react'

import { AppLink } from '@/components/app-link'
import { DocsShell } from '@/components/docs/docs-shell'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardFooter, CardText, CardTitle } from '@/components/ui/card'
import { Chip } from '@/components/ui/chip'
import { SITE } from '@/lib/site'

const TOPICS = [
  {
    title: 'Quickstart',
    description: 'Local Docker setup, env files, and hosted-demo expectations.',
    href: '/docs/quickstart',
    chips: ['Local', 'Hosted'],
  },
  {
    title: 'Redis',
    description: 'Key design, TTL, cache-aside, rate limits, and namespaced Pub/Sub.',
    href: '/docs/redis',
    chips: ['Keys', 'Cache'],
  },
  {
    title: 'BullMQ',
    description: 'Enqueue, lifecycle states, retries, delay, priority, and workers.',
    href: '/docs/bullmq',
    chips: ['Jobs', 'Workers'],
  },
  {
    title: 'Toolkit',
    description: 'Reuse @queuekit packages in another Node.js project.',
    href: '/docs/toolkit',
    chips: ['Packages'],
  },
  {
    title: 'Deployment',
    description: 'Cloudflare Pages + Railway free-tier constraints and env vars.',
    href: '/docs/deployment',
    chips: ['Pages', 'Railway'],
  },
  {
    title: 'API reference',
    description: 'Versioned /api/v1 routes the UI and demos call.',
    href: '/docs/api',
    chips: ['REST', 'SSE'],
  },
] as const

export function DocsHome() {
  return (
    <DocsShell
      title="Docs"
      lead="Quickstart, Redis, BullMQ, toolkit reuse, deployment, and API reference."
      highlight="toolkit reuse"
    >
      <Alert tone="warning" title="Non-production demo">
        {SITE.disclaimer} Live Lab and Studio results come from the API. Session charts and
        comparison numbers are labeled when they are demo-only or simulated.
      </Alert>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {TOPICS.map((topic) => (
          <Card key={topic.href}>
            <CardBody>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {topic.chips.map((chip) => (
                  <Chip key={chip}>{chip}</Chip>
                ))}
              </div>
              <CardTitle>{topic.title}</CardTitle>
              <CardText className="line-clamp-none">{topic.description}</CardText>
              <CardFooter>
                <Button variant="soft" size="sm" asChild iconRight={<ArrowRight />}>
                  <AppLink href={topic.href}>Open</AppLink>
                </Button>
              </CardFooter>
            </CardBody>
          </Card>
        ))}
      </div>
    </DocsShell>
  )
}
