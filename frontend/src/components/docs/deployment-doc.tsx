import { DocsShell } from '@/components/docs/docs-shell'
import { DocInlineCode, DocList, DocP, DocSection } from '@/components/docs/docs-prose'
import { Alert } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { SITE } from '@/lib/site'

export function DeploymentDoc() {
  return (
    <DocsShell
      title="Deployment"
      lead="Free-tier deployment constraints for Cloudflare Pages and Railway."
      highlight="Free-tier deployment constraints"
    >
      <Alert tone="warning" title="₹0/month target, not a guarantee">
        {SITE.disclaimer} Quotas, cold starts, and ephemeral storage are expected.
      </Alert>

      <DocSection id="shape" title="One repo, two deploys">
        <DocList
          items={[
            <>
              <DocInlineCode>frontend/</DocInlineCode> → Cloudflare Pages (static export to{' '}
              <DocInlineCode>out</DocInlineCode>).
            </>,
            <>
              <DocInlineCode>backend/</DocInlineCode> → Railway (API + optional in-process worker).
            </>,
            <>
              <DocInlineCode>packages/</DocInlineCode> build with the backend; keep Railway root at
              the repository root so workspace packages resolve.
            </>,
          ]}
        />
      </DocSection>

      <Separator />

      <DocSection id="pages" title="Cloudflare Pages">
        <DocP>
          Build from the repository root. The frontend depends on workspace package{' '}
          <DocInlineCode>@queuekit/shared</DocInlineCode>, so a Pages root of{' '}
          <DocInlineCode>frontend</DocInlineCode> alone will fail install.
        </DocP>
        <DocList
          items={[
            <>
              Root directory: <DocInlineCode>/</DocInlineCode> (repo root)
            </>,
            <>
              Build: <DocInlineCode>npm ci && npm run build:frontend</DocInlineCode>
            </>,
            <>
              Output: <DocInlineCode>frontend/out</DocInlineCode>
            </>,
            <>
              Env: <DocInlineCode>NEXT_PUBLIC_QUEUEKIT_API_URL</DocInlineCode> = Railway API origin
              (no trailing slash).
            </>,
            'Static export only. No Next.js Node server runtime on Pages.',
          ]}
        />
      </DocSection>

      <Separator />

      <DocSection id="railway" title="Railway (API + worker)">
        <DocList
          items={[
            'Root directory must be the repository root, not backend alone.',
            <>
              Build: <DocInlineCode>npm ci && npm run build:backend</DocInlineCode>
            </>,
            <>
              Start: <DocInlineCode>npm run start:backend</DocInlineCode>
            </>,
            <>
              Required env: <DocInlineCode>REDIS_URL</DocInlineCode>,{' '}
              <DocInlineCode>CORS_ORIGIN</DocInlineCode>,{' '}
              <DocInlineCode>QUEUEKIT_API_HOST_URL</DocInlineCode>, <DocInlineCode>PORT</DocInlineCode>.
            </>,
            <>
              Free tier: set <DocInlineCode>RUN_WORKER=true</DocInlineCode> so the demo worker shares
              the API process while awake.
            </>,
          ]}
        />
      </DocSection>

      <Separator />

      <DocSection id="env" title="Environment reference (public vs secret)">
        <DocP>
          Browser code may only use public <DocInlineCode>NEXT_PUBLIC_*</DocInlineCode> values.
          Redis URLs and other secrets stay on the API.
        </DocP>
        <DocList
          items={[
            <>
              Frontend: <DocInlineCode>NEXT_PUBLIC_QUEUEKIT_API_URL</DocInlineCode>
            </>,
            <>
              Backend: <DocInlineCode>REDIS_URL</DocInlineCode>,{' '}
              <DocInlineCode>REDIS_KEY_PREFIX</DocInlineCode>, rate-limit knobs,{' '}
              <DocInlineCode>CORS_ORIGIN</DocInlineCode>,{' '}
              <DocInlineCode>QUEUEKIT_API_HOST_URL</DocInlineCode>, <DocInlineCode>RUN_WORKER</DocInlineCode>
            </>,
          ]}
        />
      </DocSection>
    </DocsShell>
  )
}
