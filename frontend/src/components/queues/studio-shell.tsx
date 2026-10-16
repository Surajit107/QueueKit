import * as React from 'react'

import { StudioNav } from '@/components/queues/studio-nav'
import { SectionHead } from '@/components/section-head'
import { Highlight } from '@/components/ui/highlight'

export function StudioShell({
  title,
  lead,
  highlight,
  children,
}: {
  title: string
  lead: string
  highlight: string
  children: React.ReactNode
}) {
  const [before, after] = lead.split(highlight)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <SectionHead title={title}>
          <span suppressHydrationWarning>
            {before}
            <Highlight>{highlight}</Highlight>
            {after}
          </span>
        </SectionHead>
        <StudioNav />
      </div>
      {children}
    </div>
  )
}
