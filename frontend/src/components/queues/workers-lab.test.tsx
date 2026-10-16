import type { ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'

import { WorkersLab } from '@/components/queues/workers-lab'
import { renderWithProviders } from '@/test/render'
import type { StatusViewModel } from '@/lib/api/map-status'

vi.mock('next/navigation', () => ({
  usePathname: () => '/queues/workers',
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

const useSystemStatus = vi.fn()

vi.mock('@/hooks/use-system-status', () => ({
  useSystemStatus: () => useSystemStatus(),
}))

function statusStub(overrides: {
  isPending?: boolean
  isError?: boolean
  isFetching?: boolean
  data?: { workerHeartbeatAt: string | null }
  view?: StatusViewModel
}) {
  const view: StatusViewModel = overrides.view ?? {
    reconnecting: false,
    notes: [],
    services: [
      { id: 'api', label: 'API', status: 'healthy', detail: 'OK' },
      { id: 'redis', label: 'Redis', status: 'healthy', detail: 'OK' },
      {
        id: 'worker',
        label: 'Worker',
        status: 'offline',
        detail: 'Worker process not reporting.',
      },
    ],
  }

  return {
    data: overrides.data,
    isPending: overrides.isPending ?? false,
    isError: overrides.isError ?? false,
    isFetching: overrides.isFetching ?? false,
    refetch: vi.fn(),
    view,
  }
}

describe('WorkersLab', () => {
  beforeEach(() => {
    useSystemStatus.mockReset()
  })

  it('shows offline worker status from the last API report', async () => {
    useSystemStatus.mockReturnValue(
      statusStub({
        data: { workerHeartbeatAt: null },
      }),
    )

    renderWithProviders(<WorkersLab />)

    expect(await screen.findByLabelText('Worker: offline')).toHaveTextContent('Offline')
    expect(screen.getByText('Worker process not reporting.')).toBeInTheDocument()
    expect(screen.getByText('No heartbeat timestamp reported.')).toBeInTheDocument()
  })

  it('keeps worker unknown when status poll fails', async () => {
    useSystemStatus.mockReturnValue(
      statusStub({
        isError: true,
        view: {
          reconnecting: false,
          notes: [],
          services: [
            { id: 'api', label: 'API', status: 'offline', detail: 'Unreachable' },
            { id: 'redis', label: 'Redis', status: 'unknown', detail: 'No Redis status confirmed.' },
            { id: 'worker', label: 'Worker', status: 'unknown', detail: 'No worker status confirmed.' },
          ],
        },
      }),
    )

    renderWithProviders(<WorkersLab />)

    expect(await screen.findByLabelText('Worker: unknown')).toHaveTextContent('Unknown')
    expect(
      screen.getByText('Status poll failed — values stay unknown/offline honestly.'),
    ).toBeInTheDocument()
  })
})
