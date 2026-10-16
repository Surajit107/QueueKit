import { Chip } from '@/components/ui/chip'
import { LiveDot } from '@/components/ui/live-dot'
import type { JobState } from '@/lib/api/queues'

const COPY: Record<JobState, string> = {
  waiting: 'Waiting',
  active: 'Active',
  delayed: 'Delayed',
  completed: 'Completed',
  failed: 'Failed',
  paused: 'Paused',
  unknown: 'Unknown',
}

const TONE: Record<JobState, 'default' | 'success' | 'danger' | 'special'> = {
  waiting: 'default',
  active: 'special',
  delayed: 'special',
  completed: 'success',
  failed: 'danger',
  paused: 'default',
  unknown: 'default',
}

/** Text + tone — never color-only. */
export function JobStateBadge({ state }: { state: JobState }) {
  const label = COPY[state]
  if (state === 'active') {
    return (
      <LiveDot tone="special" aria-label={`State: ${label}`}>
        {label}
      </LiveDot>
    )
  }
  if (state === 'completed') {
    return (
      <LiveDot tone="success" aria-label={`State: ${label}`}>
        {label}
      </LiveDot>
    )
  }
  return (
    <Chip tone={TONE[state]} aria-label={`State: ${label}`}>
      {label}
    </Chip>
  )
}
