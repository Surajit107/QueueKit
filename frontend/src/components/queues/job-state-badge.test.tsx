import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { JobStateBadge } from '@/components/queues/job-state-badge'
import type { JobState } from '@/lib/api/queues'

const lifecycle: JobState[] = ['waiting', 'active', 'delayed', 'completed', 'failed', 'paused', 'unknown']

describe('JobStateBadge', () => {
  it.each(lifecycle)('renders %s with text and aria-label', (state) => {
    render(<JobStateBadge state={state} />)

    const expected =
      state === 'waiting'
        ? 'Waiting'
        : state === 'active'
          ? 'Active'
          : state === 'delayed'
            ? 'Delayed'
            : state === 'completed'
              ? 'Completed'
              : state === 'failed'
                ? 'Failed'
                : state === 'paused'
                  ? 'Paused'
                  : 'Unknown'

    expect(screen.getByLabelText(`State: ${expected}`)).toHaveTextContent(expected)
  })
})
