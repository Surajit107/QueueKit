import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'

import { DataSourceChip } from '@/components/docs/data-source-label'
import { renderWithProviders } from '@/test/render'

describe('DataSourceChip', () => {
  it('labels live API, demo session, and simulated sources', () => {
    const { rerender } = renderWithProviders(<DataSourceChip source="live-api" />)
    expect(screen.getByText('live from API')).toBeInTheDocument()

    rerender(<DataSourceChip source="demo-session" />)
    expect(screen.getByText('demo only')).toBeInTheDocument()

    rerender(<DataSourceChip source="simulated" />)
    expect(screen.getByText('simulated')).toBeInTheDocument()
  })
})
