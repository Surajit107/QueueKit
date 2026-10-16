import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import HomePage from '@/app/page'
import { SITE } from '@/lib/site'

vi.mock('@/components/system-status', () => ({
  SystemStatus: () => <div data-testid="system-status-stub" />,
}))

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

describe('HomePage', () => {
  it('surfaces the hosted demo disclaimer from SITE config', () => {
    render(<HomePage />)

    expect(screen.getByText('Hosted demo limits')).toBeInTheDocument()
    expect(screen.getByText(SITE.disclaimer)).toBeInTheDocument()
  })
})
