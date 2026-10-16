import { describe, it, expect } from 'vitest'

import nextConfig from '../../next.config'

describe('next.config static export', () => {
  it('default export sets output to export for static hosting', () => {
    expect(nextConfig.output).toBe('export')
  })
})
