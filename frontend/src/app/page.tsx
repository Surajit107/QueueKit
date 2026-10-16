import { ArrowRight } from 'lucide-react'

import { AppLink } from '@/components/app-link'
import { CtaPanel } from '@/components/cta-panel'
import { FeatureBento } from '@/components/feature-bento'
import { FlowVisual } from '@/components/flow-visual'
import { Hero } from '@/components/hero'
import { SectionHead } from '@/components/section-head'
import { SystemStatus } from '@/components/system-status'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardFooter, CardText, CardTitle } from '@/components/ui/card'
import { Chip } from '@/components/ui/chip'
import { Highlight } from '@/components/ui/highlight'
import { SITE } from '@/lib/site'

export default function HomePage() {
  return (
    <div className="flex flex-col gap-16 sm:gap-20">
      <Hero
        badge="Free Redis + BullMQ playground"
        title="QueueKit"
        primary={{ label: 'Open Redis Lab', href: '/playground' }}
        secondary={{ label: 'Explore Queue Studio', href: '/queues' }}
        media={<FlowVisual />}
      >
        Explore Redis, understand background jobs, and reuse{' '}
        <Highlight>production-shaped Node.js infrastructure</Highlight>.
      </Hero>

      <Alert tone="warning" title="Hosted demo limits">
        {SITE.disclaimer}
      </Alert>

      <section aria-labelledby="status-heading" className="flex flex-col gap-6">
        <SectionHead id="status-heading" title="Live system status">
          API, Redis, and worker health from the backend. Status stays{' '}
          <Highlight>unknown until confirmed</Highlight>.
        </SectionHead>
        <SystemStatus />
      </section>

      <section aria-labelledby="redis-heading" className="flex flex-col gap-6">
        <SectionHead
          id="redis-heading"
          title="Explore Redis"
          action={{ label: 'Open Redis Lab', href: '/playground' }}
        >
          Cache, TTL, data structures, counters, and{' '}
          <Highlight>rate limiting</Highlight> against a real Redis-compatible store.
        </SectionHead>
        <div className="grid gap-4 md:grid-cols-3">
          {REDIS_CARDS.map((card) => (
            <Card key={card.href}>
              <CardBody>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {card.chips.map((chip) => (
                    <Chip key={chip}>{chip}</Chip>
                  ))}
                </div>
                <CardTitle>{card.title}</CardTitle>
                <CardText>{card.description}</CardText>
                <CardFooter>
                  <span className="text-xs text-muted-foreground">{card.note}</span>
                  <Button variant="soft" size="sm" asChild iconRight={<ArrowRight />}>
                    <AppLink href={card.href}>Open</AppLink>
                  </Button>
                </CardFooter>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="queues-heading" className="flex flex-col gap-6">
        <SectionHead
          id="queues-heading"
          title="Explore BullMQ"
          action={{ label: 'Open Queue Studio', href: '/queues' }}
        >
          Enqueue demo jobs, watch lifecycle states, retry, delay, and{' '}
          <Highlight>inspect failures</Highlight>.
        </SectionHead>
        <div className="grid gap-4 md:grid-cols-3">
          {QUEUE_CARDS.map((card) => (
            <Card key={card.href}>
              <CardBody>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {card.chips.map((chip) => (
                    <Chip key={chip}>{chip}</Chip>
                  ))}
                </div>
                <CardTitle>{card.title}</CardTitle>
                <CardText>{card.description}</CardText>
                <CardFooter>
                  <span className="text-xs text-muted-foreground">{card.note}</span>
                  <Button variant="soft" size="sm" asChild iconRight={<ArrowRight />}>
                    <AppLink href={card.href}>Open</AppLink>
                  </Button>
                </CardFooter>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="how-heading" className="flex flex-col gap-6">
        <SectionHead id="how-heading" title="How it works">
          One clear path: API to queue to worker to{' '}
          <Highlight>Redis</Highlight>.
        </SectionHead>
        <FeatureBento features={HOW_IT_WORKS} />
      </section>

      <section aria-labelledby="toolkit-heading" className="flex flex-col gap-6">
        <SectionHead id="toolkit-heading" title="Reuse the toolkit">
          Packages stay independent of the demo UI so you can{' '}
          <Highlight>copy them into another Node.js app</Highlight>.
        </SectionHead>
        <FeatureBento features={TOOLKIT_FEATURES} />
      </section>

      <CtaPanel
        heading="Read the docs or browse the source"
        tagline="Quickstart, Redis and BullMQ concepts, toolkit reuse, and free-tier deployment constraints."
        action={{ label: 'Read the Docs', href: '/docs' }}
      />
    </div>
  )
}

const REDIS_CARDS = [
  {
    title: 'Keys and TTL',
    description: 'Set, get, delete, and inspect allowlisted demo keys with server-confirmed TTL.',
    href: '/playground/keys',
    chips: ['String', 'TTL'],
    note: 'Namespaced demo keys only',
  },
  {
    title: 'Cache-aside',
    description: 'Hit and miss paths with labeled demo metrics, not invented production numbers.',
    href: '/playground/cache',
    chips: ['Cache', 'Metrics'],
    note: 'Demo metrics labeled',
  },
  {
    title: 'Rate limits',
    description: 'See allow versus deny with a clear scope and honest failure states.',
    href: '/playground/limits',
    chips: ['Counters', 'Limits'],
    note: 'Safe to repeat',
  },
] as const

const QUEUE_CARDS = [
  {
    title: 'Enqueue jobs',
    description: 'Submit an allowlisted demo job through a validated form.',
    href: '/queues',
    chips: ['Producer'],
    note: 'Allowlisted payloads',
  },
  {
    title: 'Job lifecycle',
    description: 'Waiting, active, delayed, completed, and failed, updated live when the API allows.',
    href: '/queues/jobs',
    chips: ['States', 'SSE'],
    note: 'Polling fallback ready',
  },
  {
    title: 'Workers',
    description: 'Concurrency and last-reported health without fabricating online status.',
    href: '/queues/workers',
    chips: ['Worker'],
    note: 'Honest offline states',
  },
] as const

const HOW_IT_WORKS = [
  {
    title: 'API',
    description: 'Express validates requests, enqueues work, and exposes Redis demo routes.',
    tone: 'blue' as const,
    link: { label: 'API docs', href: '/docs/api' },
  },
  {
    title: 'Queue',
    description: 'BullMQ holds waiting, delayed, and active jobs for the demo worker.',
    tone: 'purple' as const,
    link: { label: 'Queue Studio', href: '/queues' },
  },
  {
    title: 'Worker',
    description: 'Processes allowlisted jobs with retries, delays, and sanitized errors.',
    tone: 'amber' as const,
    link: { label: 'Workers', href: '/queues/workers' },
  },
  {
    title: 'Redis',
    description: 'Stores keys, cache entries, counters, and BullMQ state for the playground.',
    tone: 'grey' as const,
    link: { label: 'Redis Lab', href: '/playground' },
  },
  {
    title: 'SSE',
    description: 'Live job updates when the connection holds, with polling as fallback.',
    tone: 'grey' as const,
  },
  {
    title: 'Static UI',
    description: 'Next.js static export on Cloudflare Pages, no server secrets in the bundle.',
    tone: 'grey' as const,
  },
  {
    title: 'Free tier',
    description: 'Sleep, resets, and ephemeral data are expected and called out in the UI.',
    tone: 'grey' as const,
    link: { label: 'About limits', href: '/about' },
  },
]

const TOOLKIT_FEATURES = [
  {
    title: 'redis-toolkit',
    description: 'Client lifecycle, typed keys, cache-aside helpers, TTL, counters, health checks.',
    tone: 'blue' as const,
    link: { label: 'Toolkit docs', href: '/docs/toolkit' },
  },
  {
    title: 'queue-toolkit',
    description: 'Queue creation, typed job contracts, retry defaults, worker helpers, events.',
    tone: 'purple' as const,
    link: { label: 'BullMQ docs', href: '/docs/bullmq' },
  },
  {
    title: 'shared',
    description: 'Shared types, validation schemas, error contracts, and safe constants.',
    tone: 'amber' as const,
  },
  {
    title: 'Injectable config',
    description: 'No hard-coded production URLs or credentials inside reusable packages.',
    tone: 'grey' as const,
  },
  {
    title: 'Testable',
    description: 'Vitest coverage planned for client, hooks, and playground surfaces.',
    tone: 'grey' as const,
  },
  {
    title: 'Copy-ready',
    description: 'Documented package boundaries so another app can adopt the toolkit with minimal changes.',
    tone: 'grey' as const,
    link: { label: 'Quickstart', href: '/docs/quickstart' },
  },
  {
    title: 'Demo-independent',
    description: 'UI and Express routes never leak into the reusable infrastructure packages.',
    tone: 'grey' as const,
  },
]
