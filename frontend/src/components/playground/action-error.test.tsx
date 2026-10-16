import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ActionError } from '@/components/playground/action-error'
import { ApiClientError } from '@/lib/api/errors'

describe('ActionError', () => {
  it('renders the error message with an accessible alert title', () => {
    render(
      <ActionError
        error={new ApiClientError('Redis action failed', { kind: 'http', status: 503 })}
        title="Could not complete action"
      />,
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Could not complete action')).toBeInTheDocument()
    expect(screen.getByText('Redis action failed')).toBeInTheDocument()
  })
})
