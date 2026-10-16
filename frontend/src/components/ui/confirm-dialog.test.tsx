import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ConfirmDialog } from '@/components/ui/confirm-dialog'

describe('ConfirmDialog', () => {
  it('uses alertdialog and blocks confirm until typeToConfirm matches', async () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    const user = userEvent.setup()

    render(
      <ConfirmDialog
        open
        title="Delete demo data?"
        confirmLabel="Delete"
        typeToConfirm="DELETE"
        onConfirm={onConfirm}
        onCancel={onCancel}
      >
        <p>This cannot be undone.</p>
      </ConfirmDialog>,
    )

    expect(screen.getByRole('alertdialog')).toBeInTheDocument()

    const confirm = screen.getByRole('button', { name: 'Delete' })
    expect(confirm).toBeDisabled()

    await user.type(screen.getByLabelText(/Type/i), 'DELETE')
    expect(confirm).toBeEnabled()

    await user.click(confirm)
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})
