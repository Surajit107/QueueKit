import { ArrowRight } from 'lucide-react'

import { AppLink } from '@/components/app-link'
import { DataSourceChip } from '@/components/docs/data-source-label'
import { DocsShell } from '@/components/docs/docs-shell'
import { DocInlineCode, DocList, DocP, DocSection } from '@/components/docs/docs-prose'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

export function RedisDoc() {
  return (
    <DocsShell
      title="Redis"
      lead="Key design, TTL, cache-aside, rate limits, and real Pub/Sub on allowlisted channels."
      highlight="allowlisted channels"
    >
      <Alert tone="info" title="Namespaced demo only">
        Public demo keys live under a fixed prefix (default <DocInlineCode>queuekit:demo:</DocInlineCode>
        ). Arbitrary Redis commands are rejected. Lab actions hit the live API.
      </Alert>

      <DocSection id="keys" title="Keys and TTL">
        <DocP>
          Demo key suffixes are allowlisted. TTL values shown in the UI come from the server
          response, not client guesses.
        </DocP>
        <DocList
          items={[
            'Set, get, and delete only under the demo namespace.',
            'Prefer short TTLs so free-tier Redis does not fill with leftovers.',
            'Reset scans and deletes the demo namespace only.',
          ]}
        />
      </DocSection>

      <Separator />

      <DocSection id="cache" title="Cache-aside">
        <div className="flex flex-wrap items-center gap-2">
          <DocP className="max-w-none">
            The cache lab runs a fixed demo key through a cache-aside path (hit vs miss).
          </DocP>
          <DataSourceChip source="demo-session" />
        </div>
        <DocList
          items={[
            'Hit and miss outcomes are live Redis results from the API.',
            'Session hit/miss/latency totals are browser-side demo metrics, not production SLOs.',
            'Force miss deletes the demo cache key before reloading a mock source.',
          ]}
        />
      </DocSection>

      <Separator />

      <DocSection id="limits" title="Rate limits">
        <DocP>
          The limits lab consumes a bounded demo bucket. Allow versus deny and remaining counts
          are returned by the API for that demonstration scope.
        </DocP>
      </DocSection>

      <Separator />

      <DocSection id="pubsub" title="Pub/Sub">
        <div className="flex flex-wrap items-center gap-2">
          <DocP className="max-w-none">
            PUBLISH and SUBSCRIBE run against real Redis on allowlisted channels, bridged to the
            browser over SSE.
          </DocP>
          <DataSourceChip source="live-api" />
        </div>
        <DocList
          items={[
            'Messages are fire-and-forget; nothing is durable.',
            'Channels outside the allowlist are rejected.',
            'If SSE drops, reconnect or refresh; do not invent missed messages in the UI.',
          ]}
        />
        <div className="pt-1">
          <Button variant="soft" size="sm" asChild iconRight={<ArrowRight />}>
            <AppLink href="/playground">Open Redis Lab</AppLink>
          </Button>
        </div>
      </DocSection>
    </DocsShell>
  )
}
