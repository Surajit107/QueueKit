import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'

import AboutPage from '@/app/about/page'
import { renderWithProviders } from '@/test/render'
import { SITE } from '@/lib/site'

describe('AboutPage', () => {
  it('states free-tier limitations and data-source callouts', () => {
    renderWithProviders(<AboutPage />)

    expect(screen.getByRole('heading', { name: /About QueueKit/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'AsterIQ' })).toBeInTheDocument()
    expect(screen.getByText(SITE.disclaimer)).toBeInTheDocument()

    expect(screen.getByRole('heading', { name: 'Free-tier limitations' })).toBeInTheDocument()
    expect(screen.getByText(/Services may sleep/)).toBeInTheDocument()

    expect(screen.getByText('live from API')).toBeInTheDocument()
    expect(screen.getByText('demo only')).toBeInTheDocument()
    expect(screen.getByText('simulated')).toBeInTheDocument()

    expect(screen.getByRole('link', { name: 'AsterIQ' })).toHaveAttribute('href', 'https://asteriq.in')
  })
})
