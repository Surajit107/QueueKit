import { DocsShell } from '@/components/docs/docs-shell'
import { DocCode, DocInlineCode, DocList, DocP, DocSection } from '@/components/docs/docs-prose'
import { Alert } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'

export function ToolkitDoc() {
  return (
    <DocsShell
      title="Toolkit"
      lead="Reuse the TypeScript packages in another Node.js project."
      highlight="TypeScript packages"
    >
      <Alert tone="info" title="Monorepo packages">
        Libraries live under <DocInlineCode>packages/</DocInlineCode> and build with the backend.
        They are not a separate hosted service.
      </Alert>

      <DocSection id="packages" title="Package map">
        <DocList
          items={[
            <>
              <DocInlineCode>@queuekit/shared</DocInlineCode>: types, error contracts, demo
              constants.
            </>,
            <>
              <DocInlineCode>@queuekit/redis-toolkit</DocInlineCode>: connection lifecycle,
              namespaced keys, cache-aside, rate limits, reset.
            </>,
            <>
              <DocInlineCode>@queuekit/queue-toolkit</DocInlineCode>: BullMQ factory, workers,
              retention, job inspection.
            </>,
          ]}
        />
      </DocSection>

      <Separator />

      <DocSection id="redis-usage" title="Redis toolkit sketch">
        <DocCode>{`import { createRedisInfrastructure } from "@queuekit/redis-toolkit";
import { DEMO_REDIS_NAMESPACE } from "@queuekit/shared";

// Server-side only: read the Redis URL from process env on the API host.
const redis = createRedisInfrastructure({
  url: redisUrlFromEnv,
  keyPrefix: DEMO_REDIS_NAMESPACE,
});

await redis.connect();
await redis.keys.setString("hello", "world", 60);
await redis.disconnect();`}</DocCode>
      </DocSection>

      <Separator />

      <DocSection id="queue-usage" title="Queue toolkit sketch">
        <DocCode>{`import { createQueueInfrastructure } from "@queuekit/queue-toolkit";
import { AvailableDemoQueues, AvailableDemoJobTypes } from "@queuekit/shared";

const queues = createQueueInfrastructure({
  url: redisUrlFromEnv,
  allowedQueues: AvailableDemoQueues,
  allowedJobTypes: AvailableDemoJobTypes,
});

await queues.enqueue("queuekit-demo", "echo", { message: "hello" });

const worker = queues.createWorker("queuekit-demo", async (job) => {
  return { echoed: job.data };
});

await queues.close();`}</DocCode>
        <DocP>
          Build from the monorepo root with <DocInlineCode>npm run build:packages</DocInlineCode>.
          For another app, copy the packages (or publish them) and keep Redis URL and allowlists in
          env, never in the browser bundle.
        </DocP>
      </DocSection>

      <Separator />

      <DocSection id="lifecycle" title="Connection lifecycle">
        <DocList
          items={[
            'Validate required env at process startup.',
            'Connect once, share the client, disconnect on shutdown.',
            'Close queues and workers gracefully so Redis connections do not leak.',
            'Bound completed/failed job retention so free-tier storage survives demos.',
          ]}
        />
      </DocSection>
    </DocsShell>
  )
}
