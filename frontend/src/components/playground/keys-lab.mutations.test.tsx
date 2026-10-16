import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { KeysLab } from '@/components/playground/keys-lab'
import type { DemoKeyList, DemoKeyRecord } from '@/lib/api'
import { redisQueryKeys } from '@/lib/query-client'
import { renderWithProviders } from '@/test/render'

vi.mock('next/navigation', () => ({
  usePathname: () => '/playground/keys',
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

const listDemoKeys = vi.fn<(signal?: AbortSignal) => Promise<DemoKeyList>>()
const createDemoKey = vi.fn<(input: unknown) => Promise<DemoKeyRecord>>()

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    listDemoKeys: (signal?: AbortSignal) => listDemoKeys(signal),
    createDemoKey: (input: unknown) => createDemoKey(input),
  }
})

const emptyList: DemoKeyList = { keys: [] }

const createdRecord: DemoKeyRecord = {
  key: 'queuekit:demo:test-key',
  value: 'hello',
  ttlSeconds: 60,
}

describe('KeysLab mutations', () => {
  beforeEach(() => {
    listDemoKeys.mockReset()
    createDemoKey.mockReset()
    listDemoKeys.mockResolvedValue(emptyList)
  })

  it('invalidates redis keys after a successful create', async () => {
    createDemoKey.mockResolvedValue(createdRecord)
    const user = userEvent.setup()

    const { queryClient } = renderWithProviders(<KeysLab />)
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    await waitFor(() => expect(screen.getByText('No demo keys yet.')).toBeInTheDocument())

    const keyInput = document.getElementById('demo-key')
    if (!(keyInput instanceof HTMLInputElement)) {
      throw new Error('Expected demo key input')
    }
    await user.type(keyInput, 'test-key')
    await user.type(screen.getByLabelText('Value'), 'hello')
    await user.click(screen.getByRole('button', { name: 'Set key' }))

    await waitFor(() => expect(createDemoKey).toHaveBeenCalled())

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: redisQueryKeys.keys() })
    expect(await screen.findByText(createdRecord.key)).toBeInTheDocument()
  })
})
