import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { SystemStatus } from '@/components/system-status'
import type { StatusViewModel } from '@/lib/api'

const useSystemStatus = vi.fn()

vi.mock('@/hooks/use-system-status', () => ({
  useSystemStatus: () => useSystemStatus(),
}))

function serviceRow(
  id: 'api' | 'redis' | 'worker',
  label: string,
  status: StatusViewModel['services'][number]['status'],
): StatusViewModel['services'][number] {
  return { id, label, status, detail: `${label} detail` }
}

function mockView(
  services: StatusViewModel['services'],
  overrides?: { isPending?: boolean; isError?: boolean },
) {
  useSystemStatus.mockReturnValue({
    isPending: overrides?.isPending ?? false,
    isError: overrides?.isError ?? false,
    isFetching: false,
    view: { services, notes: [], reconnecting: false },
  })
}

describe('SystemStatus', () => {
  it('surfaces healthy, degraded, offline, and unknown labels via aria-label text', () => {
    mockView([
      serviceRow('api', 'API', 'healthy'),
      serviceRow('redis', 'Redis', 'degraded'),
      serviceRow('worker', 'Worker', 'offline'),
    ])

    render(<SystemStatus />)

    expect(screen.getByLabelText('API: Healthy')).toHaveTextContent('Healthy')
    expect(screen.getByLabelText('Redis: Degraded')).toHaveTextContent('Degraded')
    expect(screen.getByLabelText('Worker: Offline')).toHaveTextContent('Offline')
  })

  it('shows unknown status with accessible text', () => {
    mockView([serviceRow('api', 'API', 'unknown')])

    render(<SystemStatus />)

    expect(screen.getByLabelText('API: Unknown')).toHaveTextContent('Unknown')
  })
})
