import * as React from 'react'

import { LabNav } from '@/components/playground/lab-nav'
import { SectionHead } from '@/components/section-head'
import { Highlight } from '@/components/ui/highlight'

export function LabShell({
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
        <LabNav />
      </div>
      {children}
    </div>
  )
}
