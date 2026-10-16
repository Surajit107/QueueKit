import * as React from 'react'

import { JobDetailLab } from '@/components/queues/job-detail-lab'

export const metadata = { title: 'Job detail' }

/**
 * Static-export-safe job detail. Dynamic `/queues/jobs/[id]` cannot be pre-rendered
 * for arbitrary BullMQ ids on Cloudflare Pages, so detail uses `?id=`.
 */
export default function JobDetailPage() {
  return (
    <React.Suspense fallback={<p className="text-sm text-muted-foreground">Loading job…</p>}>
      <JobDetailLab />
    </React.Suspense>
  )
}
