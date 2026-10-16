import { ArrowRight } from 'lucide-react'

import { AppLink } from '@/components/app-link'
import { DataSourceChip } from '@/components/docs/data-source-label'
import { DocsShell } from '@/components/docs/docs-shell'
import { DocInlineCode, DocList, DocP, DocSection } from '@/components/docs/docs-prose'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { DEMO_WORKER_CONCURRENCY } from '@/lib/queue-demo'

export function BullmqDoc() {
  return (
    <DocsShell
      title="BullMQ"
      lead="Queue concepts, job lifecycle, retries, delay, priority, and worker health."
      highlight="job lifecycle"
    >
      <Alert tone="info" title="Allowlisted demo queue">
        Only predefined queue names and job types are accepted. Public jobs must not trigger emails,
        SMS, payments, or other real side effects.
      </Alert>

      <DocSection id="jobs" title="Enqueue and lifecycle">
        <div className="flex flex-wrap items-center gap-2">
          <DocP className="max-w-none">
            Job lists, detail, and metrics come from the live API. Studio uses SSE with a polling
            fallback.
          </DocP>
          <DataSourceChip source="live-api" />
        </div>
        <DocList
          items={[
            <>
              Job types: <DocInlineCode>echo</DocInlineCode>, <DocInlineCode>delay</DocInlineCode>,{' '}
              <DocInlineCode>fail</DocInlineCode>.
            </>,
            <>
              Optional enqueue fields: <DocInlineCode>delayMs</DocInlineCode>,{' '}
              <DocInlineCode>priority</DocInlineCode>.
            </>,
            <>
              Detail URL is static-export safe:{' '}
              <DocInlineCode>/queues/jobs/detail?id=…</DocInlineCode> (not a dynamic path segment).
            </>,
            'States: waiting, active, delayed, completed, failed.',
          ]}
        />
      </DocSection>

      <Separator />

      <DocSection id="failure" title="Retries, delay, and simulated failure">
        <div className="flex flex-wrap items-center gap-2">
          <DocP className="max-w-none">
            The <DocInlineCode>fail</DocInlineCode> job type is a controlled failure path so you
            can watch retries. The failure itself is intentional demo behavior, not an outage.
          </DocP>
          <DataSourceChip source="simulated" />
        </div>
        <DocList
          items={[
            'Server retry defaults apply to fail jobs (attempts and backoff on the API).',
            'There is no separate manual retry route in this demo.',
            'Delay and priority are real BullMQ options on enqueue.',
          ]}
        />
      </DocSection>

      <Separator />

      <DocSection id="workers" title="Workers and metrics">
        <DocP>
          Worker health is taken from <DocInlineCode>/api/v1/status</DocInlineCode>. Concurrency
          defaults to <DocInlineCode>{DEMO_WORKER_CONCURRENCY}</DocInlineCode> in the demo worker
          and is not tunable from the UI.
        </DocP>
        <DocList
          items={[
            'Queue metrics show live counts when the API exposes them.',
            'Duration and failure-rate series are omitted when the API does not provide them. The UI does not invent charts.',
            'Pause/resume is not exposed; use confirmed demo reset to clear namespaced queue data.',
          ]}
        />
        <div className="flex flex-wrap gap-2 pt-1">
          <Button variant="soft" size="sm" asChild iconRight={<ArrowRight />}>
            <AppLink href="/queues">Open Queue Studio</AppLink>
          </Button>
          <Button variant="outline" size="sm" asChild iconRight={<ArrowRight />}>
            <AppLink href="/queues/workers">Worker health</AppLink>
          </Button>
        </div>
      </DocSection>
    </DocsShell>
  )
}
