import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Vitest 3 ships Vite 7; @vitejs/plugin-react@6 peers Vite 8 and causes
  // duplicate Plugin types. Esbuild automatic JSX is enough for unit tests.
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
