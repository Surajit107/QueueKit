import { ArrowUpRight } from 'lucide-react'

import { AppLink } from '@/components/app-link'
import { SectionHead } from '@/components/section-head'
import { Alert } from '@/components/ui/alert'
import { Highlight } from '@/components/ui/highlight'
import { buttonVariants } from '@/components/ui/button'

export function PageStub({
  title,
  lead,
  highlight,
  href = '/',
  cta = 'Back to overview',
}: {
  title: string
  lead: string
  highlight: string
  href?: string
  cta?: string
}) {
  const [before, after] = lead.split(highlight)
  return (
    <div className="flex flex-col gap-8">
      <SectionHead title={title}>
        {before}
        <Highlight>{highlight}</Highlight>
        {after}
      </SectionHead>
      <Alert tone="info" title="Surface in progress">
        ChaiUI shell and tokens are wired. Interactive API-backed controls land next against
        NEXT_PUBLIC_QUEUEKIT_API_URL.
      </Alert>
      <AppLink href={href} className={buttonVariants({ variant: 'solid' })}>
        {cta}
        <ArrowUpRight className="-ml-1" aria-hidden="true" />
      </AppLink>
    </div>
  )
}
