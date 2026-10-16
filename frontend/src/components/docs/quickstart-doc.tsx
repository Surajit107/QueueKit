import { ArrowRight } from 'lucide-react'

import { AppLink } from '@/components/app-link'
import { DocsShell } from '@/components/docs/docs-shell'
import { DocCode, DocInlineCode, DocList, DocP, DocSection } from '@/components/docs/docs-prose'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { SITE } from '@/lib/site'

export function QuickstartDoc() {
  return (
    <DocsShell
      title="Quickstart"
      lead="Local setup and hosted demo notes for getting QueueKit running."
      highlight="hosted demo notes"
    >
      <Alert tone="warning" title="Hosted demo">
        {SITE.disclaimer}
      </Alert>

      <DocSection id="local" title="Local development">
        <DocP>
          One repo, two processes. Redis via Docker Compose, API on port 8000, Next.js on port
          3000.
        </DocP>
        <DocCode>{`# from repo root
docker compose up -d
npm install
cp .env.example backend/.env
cp frontend/.env.example frontend/.env.local

npm run dev:backend
npm run dev:frontend`}</DocCode>
        <DocList
          items={[
            <>
              API health: <DocInlineCode>http://localhost:8000/health</DocInlineCode>
            </>,
            <>
              OpenAPI UI: <DocInlineCode>http://localhost:8000/docs</DocInlineCode>
            </>,
            <>
              Web UI: <DocInlineCode>http://localhost:3000</DocInlineCode>
            </>,
            <>
              Frontend env: <DocInlineCode>NEXT_PUBLIC_QUEUEKIT_API_URL=http://localhost:8000</DocInlineCode>
            </>,
          ]}
        />
      </DocSection>

      <Separator />

      <DocSection id="hosted" title="Hosted demo usage">
        <DocP>
          The public site is a free learning environment. Cold starts, sleeping services, and
          wiped Redis or queue data are expected. Prefer the reusable packages for real apps.
        </DocP>
        <DocList
          items={[
            'Use Redis Lab and Queue Studio against the live API status indicators.',
            'Reset only clears the namespaced demo prefix and allowlisted queues.',
            'Do not treat job completion or key TTL as durable storage guarantees.',
          ]}
        />
        <div className="flex flex-wrap gap-2 pt-1">
          <Button variant="solid" size="sm" asChild iconRight={<ArrowRight />}>
            <AppLink href="/playground">Open Redis Lab</AppLink>
          </Button>
          <Button variant="outline" size="sm" asChild iconRight={<ArrowRight />}>
            <AppLink href="/queues">Open Queue Studio</AppLink>
          </Button>
        </div>
      </DocSection>
    </DocsShell>
  )
}
