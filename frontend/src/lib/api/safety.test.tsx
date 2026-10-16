import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'

import { ResetDemoControl } from '@/components/playground/reset-demo-control'
import { renderWithProviders } from '@/test/render'

const FRONTEND_SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

const FORBIDDEN_PATTERNS = ['REDIS_URL', 'redis://', 'createClient', 'EVAL'] as const

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx'])

/** Client modules that talk to the API — excludes docs prose that mentions backend env names. */
const SCAN_ROOTS = [
  path.join(FRONTEND_SRC, 'lib'),
  path.join(FRONTEND_SRC, 'hooks'),
  path.join(FRONTEND_SRC, 'components', 'playground'),
  path.join(FRONTEND_SRC, 'components', 'queues'),
] as const

function shouldScanFile(relativePath: string): boolean {
  if (relativePath.includes('.test.') || relativePath.includes('.spec.')) {
    return false
  }
  return SOURCE_EXTENSIONS.has(path.extname(relativePath))
}

function collectSourceFiles(dir: string, base = FRONTEND_SRC): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue
      files.push(...collectSourceFiles(full, base))
      continue
    }
    const relative = path.relative(base, full).replace(/\\/g, '/')
    if (shouldScanFile(relative)) {
      files.push(full)
    }
  }
  return files
}

function collectClientModuleFiles(): string[] {
  return SCAN_ROOTS.flatMap((root) => collectSourceFiles(root))
}

function readApiPathLiterals(filePath: string): string[] {
  const text = fs.readFileSync(filePath, 'utf8')
  const matches = text.matchAll(/['`](\/api\/v1[^'`]*)['`]/g)
  return [...matches].map((m) => m[1])
}

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    resetDemoResources: vi.fn(),
  }
})

describe('client safety', () => {
  it('does not reference Redis credentials or raw command hooks in frontend src', () => {
    const violations: string[] = []

    for (const file of collectClientModuleFiles()) {
      const relative = path.relative(FRONTEND_SRC, file).replace(/\\/g, '/')
      const text = fs.readFileSync(file, 'utf8')
      for (const pattern of FORBIDDEN_PATTERNS) {
        if (text.includes(pattern)) {
          violations.push(`${relative}: contains "${pattern}"`)
        }
      }
    }

    expect(violations).toEqual([])
  })

  it('keeps redis and queue client paths on /api/v1 demo endpoints only', () => {
    const redisPaths = readApiPathLiterals(path.join(FRONTEND_SRC, 'lib/api/redis.ts'))
    const queuePaths = readApiPathLiterals(path.join(FRONTEND_SRC, 'lib/api/queues.ts'))

    for (const p of [...redisPaths, ...queuePaths]) {
      expect(p.startsWith('/api/v1/')).toBe(true)
      expect(p.toLowerCase()).not.toMatch(/eval|\/redis\/[^d]/)
    }

    expect(redisPaths.some((p) => p.includes('/redis/demo/'))).toBe(true)
    expect(queuePaths.some((p) => p.includes('/queues/'))).toBe(true)
  })

  it('routes destructive reset through ConfirmDialog', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ResetDemoControl />)

    await user.click(screen.getByRole('button', { name: 'Reset demo' }))
    expect(await screen.findByRole('alertdialog')).toHaveTextContent('Reset namespaced demo data?')
  })
})
