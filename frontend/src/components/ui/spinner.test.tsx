import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Spinner } from '@/components/ui/spinner'

describe('Spinner', () => {
  it('exposes a status role and screen-reader label', () => {
    render(<Spinner label="Loading jobs" />)

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('Loading jobs')).toHaveClass('sr-only')
  })
})
