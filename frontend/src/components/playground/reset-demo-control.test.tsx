import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { ResetDemoControl } from '@/components/playground/reset-demo-control'
import type { DemoResetResult } from '@/lib/api'
import { DEMO_NAMESPACE_LABEL } from '@/lib/redis-demo'
import { queueQueryKeys, redisQueryKeys, statusQueryKeys } from '@/lib/query-client'
import { renderWithProviders } from '@/test/render'

const resetDemoResources = vi.fn<() => Promise<DemoResetResult>>()

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    resetDemoResources: () => resetDemoResources(),
  }
})

const resetResult: DemoResetResult = {
  deletedKeys: 2,
  prefix: 'queuekit:demo:',
  queuesReset: ['queuekit-demo'],
}

describe('ResetDemoControl', () => {
  beforeEach(() => {
    resetDemoResources.mockReset()
  })

  it('requires typing RESET and invalidates redis and queue caches on success', async () => {
    resetDemoResources.mockResolvedValue(resetResult)
    const user = userEvent.setup()

    const { queryClient } = renderWithProviders(<ResetDemoControl />)
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    expect(screen.getByText(/Deletes only keys under/)).toHaveTextContent(DEMO_NAMESPACE_LABEL)

    await user.click(screen.getByRole('button', { name: 'Reset demo' }))

    const dialog = await screen.findByRole('alertdialog')
    expect(dialog).toBeInTheDocument()
    expect(dialog).toHaveTextContent(DEMO_NAMESPACE_LABEL)

    const confirm = within(dialog).getByRole('button', { name: 'Reset demo' })
    expect(confirm).toBeDisabled()

    await user.type(screen.getByLabelText(/Type/i), 'RESET')
    expect(confirm).toBeEnabled()

    await user.click(confirm)

    await waitFor(() => expect(resetDemoResources).toHaveBeenCalled())

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: redisQueryKeys.all })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queueQueryKeys.all })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: statusQueryKeys.all })
    expect(await screen.findByText('Demo reset complete')).toBeInTheDocument()
  })
})
