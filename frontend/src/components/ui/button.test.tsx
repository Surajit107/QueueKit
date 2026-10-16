import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Button } from '@/components/ui/button'

describe('Button', () => {
  it('renders visible label text', () => {
    render(<Button iconRight={null}>Save changes</Button>)
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument()
  })

  it('respects the disabled state', () => {
    render(
      <Button disabled iconRight={null}>
        Disabled
      </Button>,
    )
    expect(screen.getByRole('button', { name: 'Disabled' })).toBeDisabled()
  })

  it('includes focus-visible ring classes for keyboard users', () => {
    render(<Button iconRight={null}>Focus</Button>)
    expect(screen.getByRole('button', { name: 'Focus' })).toHaveClass('focus-visible:ring-[3px]')
  })
})
