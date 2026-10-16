import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AnimatedBadge } from '@/components/animated-badge'

const useReducedMotion = vi.fn<() => boolean | null>()

vi.mock('motion/react', () => ({
  useReducedMotion: () => useReducedMotion(),
}))

describe('AnimatedBadge', () => {
  it('omits the spinning glint when reduced motion is preferred', () => {
    useReducedMotion.mockReturnValue(true)

    const { container } = render(<AnimatedBadge>Badge text</AnimatedBadge>)

    expect(container.querySelector('.motion-safe\\:animate-chai-spin')).toBeNull()
  })
})
