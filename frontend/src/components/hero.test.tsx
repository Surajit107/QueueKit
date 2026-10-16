import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Hero } from '@/components/hero'

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string
    children: React.ReactNode
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('motion/react', () => ({
  useReducedMotion: () => true,
}))

describe('Hero', () => {
  it('shows the product name and primary CTA', () => {
    render(
      <Hero title="QueueKit" primary={{ label: 'Open Redis Lab', href: '/playground' }}>
        Lead copy
      </Hero>,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'QueueKit' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open Redis Lab' })).toHaveAttribute(
      'href',
      '/playground',
    )
  })
})
