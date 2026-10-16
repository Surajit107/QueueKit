import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { FOOTER_SECTIONS, NAV_LINKS, PageShell } from '@/components/page-shell'
import { ThemeProvider } from '@/components/theme-provider'
import { SITE } from '@/lib/site'

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
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

vi.mock('@/components/theme-switcher', () => ({
  ThemeSwitcher: () => <div data-testid="theme-switcher-stub" />,
}))

describe('PageShell', () => {
  it('declares primary nav destinations', () => {
    expect(NAV_LINKS.map((link) => link.label)).toEqual([
      'Overview',
      'Redis Lab',
      'Queue Studio',
      'Docs',
      'GitHub',
    ])
    expect(NAV_LINKS.find((link) => link.label === 'Redis Lab')?.href).toBe('/playground')
    expect(NAV_LINKS.find((link) => link.label === 'Queue Studio')?.href).toBe('/queues')
  })

  it('includes AsterIQ in footer project links', () => {
    const project = FOOTER_SECTIONS.find((section) => section.title === 'Project')
    expect(project?.links.some((link) => link.label === 'AsterIQ')).toBe(true)
    expect(project?.links.find((link) => link.label === 'AsterIQ')?.href).toBe('https://asteriq.in')
  })

  it('renders shell landmarks with mocked navbar chrome', () => {
    render(
      <ThemeProvider>
        <PageShell>
          <p>Page body</p>
        </PageShell>
      </ThemeProvider>,
    )

    expect(screen.getByRole('main')).toHaveTextContent('Page body')
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute(
      'href',
      '#main-content',
    )
    expect(screen.getByText(SITE.descriptor)).toBeInTheDocument()
  })
})
