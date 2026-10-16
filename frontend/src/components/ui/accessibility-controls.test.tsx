import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { ResetDemoControl } from '@/components/playground/reset-demo-control'
import { MenuToggle } from '@/components/menu-toggle'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { renderWithProviders } from '@/test/render'

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    resetDemoResources: vi.fn(),
  }
})

describe('accessibility — interactive controls', () => {
  it('Button exposes an accessible name and focus-visible ring classes', () => {
    renderWithProviders(
      <Button variant="solid" iconRight={null}>
        Save draft
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'Save draft' })
    expect(button.className).toMatch(/focus-visible:ring/)
  })

  it('ConfirmDialog exposes alertdialog actions with labels', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const onCancel = vi.fn()

    renderWithProviders(
      <ConfirmDialog
        open
        title="Delete item?"
        confirmLabel="Delete"
        onConfirm={onConfirm}
        onCancel={onCancel}
      >
        <p>This cannot be undone.</p>
      </ConfirmDialog>,
    )

    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalled()
  })

  it('MenuToggle toggles accessible open/close names', () => {
    const { rerender } = renderWithProviders(<MenuToggle open={false} />)
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute('aria-expanded', 'false')

    rerender(<MenuToggle open />)
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('Reset demo is activated by button click, not hover-only', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ResetDemoControl />)

    await user.click(screen.getByRole('button', { name: 'Reset demo' }))
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
  })
})
