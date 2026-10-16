import { DocsShell } from '@/components/docs/docs-shell'
import { DocInlineCode, DocP, DocSection } from '@/components/docs/docs-prose'
import { Alert } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'

const ENDPOINTS: ReadonlyArray<{ method: string; path: string; purpose: string }> = [
  { method: 'GET', path: '/health', purpose: 'Basic API health' },
  { method: 'GET', path: '/api/v1/status', purpose: 'API, Redis, and worker status' },
  { method: 'GET', path: '/api/v1/redis/demo/keys', purpose: 'List allowlisted demo keys' },
  { method: 'POST', path: '/api/v1/redis/demo/keys', purpose: 'Create or update a demo key' },
  { method: 'GET', path: '/api/v1/redis/demo/keys/:key', purpose: 'Read a namespaced demo key' },
  { method: 'DELETE', path: '/api/v1/redis/demo/keys/:key', purpose: 'Delete a demo key' },
  { method: 'POST', path: '/api/v1/redis/demo/cache', purpose: 'Cache-aside demonstration' },
  { method: 'POST', path: '/api/v1/redis/demo/rate-limit', purpose: 'Bounded rate-limit demo' },
  {
    method: 'GET',
    path: '/api/v1/redis/demo/pubsub/channels',
    purpose: 'List allowlisted Pub/Sub channels',
  },
  {
    method: 'POST',
    path: '/api/v1/redis/demo/pubsub/publish',
    purpose: 'Publish on an allowlisted channel',
  },
  {
    method: 'GET',
    path: '/api/v1/redis/demo/pubsub/events',
    purpose: 'SSE bridge for Redis Pub/Sub',
  },
  { method: 'POST', path: '/api/v1/queues/:queue/jobs', purpose: 'Enqueue an allowlisted demo job' },
  { method: 'GET', path: '/api/v1/queues/:queue/jobs', purpose: 'List recent demo jobs' },
  { method: 'GET', path: '/api/v1/queues/:queue/jobs/:jobId', purpose: 'Inspect a demo job' },
  { method: 'GET', path: '/api/v1/queues/:queue/metrics', purpose: 'Queue counts and metrics' },
  { method: 'GET', path: '/api/v1/events', purpose: 'SSE stream for allowed demo events' },
  { method: 'POST', path: '/api/v1/demo/reset', purpose: 'Reset namespaced demo resources only' },
]

export function ApiDoc() {
  return (
    <DocsShell
      title="API reference"
      lead="Versioned routes under /api/v1 that power the playground and Queue Studio."
      highlight="/api/v1"
    >
      <Alert tone="info" title="Contract notes">
        Exact shapes may evolve, but the public surface stays explicit. Prefer the backend OpenAPI
        UI at <DocInlineCode>/docs</DocInlineCode> on a running API for request/response schemas.
        The frontend never sends arbitrary Redis commands.
      </Alert>

      <DocSection id="base" title="Base URL">
        <DocP>
          Configure the static UI with <DocInlineCode>NEXT_PUBLIC_QUEUEKIT_API_URL</DocInlineCode>{' '}
          (no trailing slash). Local default: <DocInlineCode>http://localhost:8000</DocInlineCode>.
        </DocP>
      </DocSection>

      <Separator />

      <DocSection id="routes" title="Routes">
        <div className="overflow-x-auto rounded-xl border border-card-edge">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="border-b border-card-edge bg-black/5 text-muted-foreground dark:bg-white/5">
              <tr>
                <th className="px-3 py-2 font-montserrat font-semibold">Method</th>
                <th className="px-3 py-2 font-montserrat font-semibold">Path</th>
                <th className="px-3 py-2 font-montserrat font-semibold">Purpose</th>
              </tr>
            </thead>
            <tbody>
              {ENDPOINTS.map((row) => (
                <tr key={`${row.method}-${row.path}`} className="border-b border-card-edge last:border-0">
                  <td className="px-3 py-2 font-mono text-xs">{row.method}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.path}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DocSection>
    </DocsShell>
  )
}
