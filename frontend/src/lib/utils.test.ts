import { describe, it, expect } from 'vitest'

import { cn } from '@/lib/utils'

describe('cn', () => {
  it('merges conditional class names', () => {
    expect(cn('px-2', false && 'hidden', 'py-1')).toBe('px-2 py-1')
  })

  it('deduplicates conflicting Tailwind utilities via tailwind-merge', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
    expect(cn('text-sm', 'text-lg')).toBe('text-lg')
  })

  it('handles array and object inputs like clsx', () => {
    expect(cn(['font-medium', { underline: true, 'line-through': false }])).toBe(
      'font-medium underline',
    )
  })
})
