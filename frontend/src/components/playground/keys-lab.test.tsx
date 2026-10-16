import type { ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { KeysLab } from '@/components/playground/keys-lab'
import { renderWithProviders } from '@/test/render'
import { ApiClientError } from '@/lib/api/errors'
import type { DemoKeyList, DemoKeyRecord } from '@/lib/api/redis'

vi.mock('next/navigation', () => ({
  usePathname: () => '/playground/keys',
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

const listDemoKeys = vi.fn<[], Promise<DemoKeyList>>()
const createDemoKey = vi.fn<[Parameters<typeof import('@/lib/api')['createDemoKey']>[0]], Promise<DemoKeyRecord>>()
const getDemoKey = vi.fn()
const deleteDemoKey = vi.fn()

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    listDemoKeys: (...args: Parameters<typeof actual.listDemoKeys>) => listDemoKeys(...args),
    createDemoKey: (...args: Parameters<typeof actual.createDemoKey>) => createDemoKey(...args),
    getDemoKey: (...args: Parameters<typeof actual.getDemoKey>) => getDemoKey(...args),
    deleteDemoKey: (...args: Parameters<typeof actual.deleteDemoKey>) => deleteDemoKey(...args),
  }
})

describe('KeysLab', () => {
  beforeEach(() => {
    listDemoKeys.mockResolvedValue({ keys: [] })
    createDemoKey.mockReset()
    getDemoKey.mockReset()
    deleteDemoKey.mockReset()
  })

  it('shows validation errors before calling the API on set key', async () => {
    const user = userEvent.setup()
    renderWithProviders(<KeysLab />)

    await user.click(screen.getByRole('button', { name: 'Set key' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Key is required.')
    expect(createDemoKey).not.toHaveBeenCalled()
  })

  it('displays TTL from the server record using formatTtl', async () => {
    const user = userEvent.setup()
    createDemoKey.mockResolvedValue({
      key: 'queuekit:demo:example:user:1',
      value: 'hello',
      ttlSeconds: 90,
    })

    renderWithProviders(<KeysLab />)

    const [keyField, valueField] = [
      document.getElementById('demo-key'),
      document.getElementById('demo-value'),
    ]
    if (!keyField || !valueField) throw new Error('Expected set-key form fields')
    await user.type(keyField, 'example:user:1')
    await user.type(valueField, 'hello')
    await user.click(screen.getByRole('button', { name: 'Set key' }))

    expect(await screen.findByText('TTL 1m 30s')).toBeInTheDocument()
  })

  it('surfaces API failures through ActionError instead of a blank screen', async () => {
    const user = userEvent.setup()
    createDemoKey.mockRejectedValue(
      new ApiClientError('Demo key write rejected.', { kind: 'http', status: 503 }),
    )

    renderWithProviders(<KeysLab />)

    const keyField = document.getElementById('demo-key')
    const valueField = document.getElementById('demo-value')
    if (!keyField || !valueField) throw new Error('Expected set-key form fields')
    await user.type(keyField, 'example:user:1')
    await user.type(valueField, 'hello')
    await user.click(screen.getByRole('button', { name: 'Set key' }))

    await waitFor(() => {
      expect(screen.getByText('Redis action failed')).toBeInTheDocument()
    })
    expect(screen.getByText('Demo key write rejected.')).toBeInTheDocument()
  })
})
