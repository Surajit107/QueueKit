import { ArrowUpRight } from 'lucide-react'

import { AppLink } from '@/components/app-link'
import { DataSourceChip } from '@/components/docs/data-source-label'
import { DocInlineCode, DocList, DocP, DocSection } from '@/components/docs/docs-prose'
import { SectionHead } from '@/components/section-head'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Highlight } from '@/components/ui/highlight'
import { Separator } from '@/components/ui/separator'
import { SITE } from '@/lib/site'

export const metadata = { title: 'About' }

export default function AboutPage() {
  return (
    <div className="flex flex-col gap-8">
      <SectionHead title="About QueueKit">
        A free Redis and BullMQ playground built by <Highlight>AsterIQ</Highlight>, with a
        reusable TypeScript toolkit.
      </SectionHead>

      <Alert tone="warning" title="Non-production demo">
        {SITE.disclaimer}
      </Alert>

      <DocSection id="project" title="What this is">
        <DocP>
          QueueKit is a learning-facing demo: explore Redis Lab, watch BullMQ jobs in Queue Studio,
          and copy the workspace packages into real Node.js services. The dashboard is the
          showcase. The packages are the lasting value.
        </DocP>
      </DocSection>

      <Separator />

      <DocSection id="limitations" title="Free-tier limitations">
        <DocP>
          The hosted demo targets ₹0/month services. That is a cost target, not an uptime or
          durability SLA.
        </DocP>
        <DocList
          items={[
            'Services may sleep; the first request after idle can be slow.',
            'Redis keys and queue jobs may vanish after restarts or resets.',
            'Job processing is not guaranteed to be durable on ephemeral storage.',
            'Rate limits and payload caps protect the shared demo from abuse.',
            'No real emails, SMS, payments, or other external side effects from public jobs.',
          ]}
        />
      </DocSection>

      <Separator />

      <DocSection id="data-labels" title="Live vs demo vs simulated">
        <DocP>
          The UI must stay honest about where numbers come from. Look for these labels on Labs and
          Studio:
        </DocP>
        <ul className="flex max-w-3xl flex-col gap-2 text-base text-muted-foreground">
          <li className="flex flex-wrap items-center gap-2">
            <DataSourceChip source="live-api" />
            Values returned by the QueueKit API (status, keys, jobs, Pub/Sub).
          </li>
          <li className="flex flex-wrap items-center gap-2">
            <DataSourceChip source="demo-session" />
            Browser-session totals (for example cache hit/miss charts), not production SLOs.
          </li>
          <li className="flex flex-wrap items-center gap-2">
            <DataSourceChip source="simulated" />
            Intentional demo behavior (for example the <DocInlineCode>fail</DocInlineCode> job
            path), not an outage.
          </li>
        </ul>
      </DocSection>

      <Separator />

      <DocSection id="asteriq" title="AsterIQ">
        <DocP>
          QueueKit is built by {SITE.owner}. Parent attribution belongs on this page and in the
          footer, not buried in fine print.
        </DocP>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button variant="solid" size="sm" asChild iconRight={<ArrowUpRight />}>
            <a href="https://asteriq.in" target="_blank" rel="noopener noreferrer">
              AsterIQ
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild iconRight={<ArrowUpRight />}>
            <a href={SITE.githubUrl} target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
          </Button>
          <Button variant="soft" size="sm" asChild>
            <AppLink href="/docs">Read the docs</AppLink>
          </Button>
        </div>
      </DocSection>
    </div>
  )
}
