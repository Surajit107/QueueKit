import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import type { ReactNode } from 'react'

import { DocsNav } from '@/components/docs/docs-nav'
import { renderWithProviders } from '@/test/render'

vi.mock('next/navigation', () => ({
  usePathname: () => '/docs/quickstart',
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string
    children: ReactNode
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

describe('DocsNav', () => {
  it('renders documentation section links', () => {
    renderWithProviders(<DocsNav />)

    const nav = screen.getByRole('navigation', { name: 'Documentation sections' })
    expect(nav).toBeInTheDocument()

    for (const label of [
      'Overview',
      'Quickstart',
      'Redis',
      'BullMQ',
      'Toolkit',
      'Deploy',
      'API',
    ]) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument()
    }

    expect(screen.getByRole('link', { name: 'Quickstart' })).toHaveAttribute('aria-current', 'page')
  })
})
