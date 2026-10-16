import type { NextConfig } from 'next'
import path from 'node:path'

const nextConfig: NextConfig = {
  output: 'export',
  // Strict Mode double-mounts effects in dev and aborts in-flight fetches.
  // That shows up in DevTools as red metrics/jobs/status rows with
  // "Response headers (0)" even though the retry succeeds — confusing and noisy.
  reactStrictMode: false,
  images: {
    unoptimized: true,
  },
  turbopack: {
    // npm workspaces hoist `next` to the repo root. Without this, Turbopack
    // treats `frontend/` as the filesystem root and cannot see ../node_modules/next.
    // https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack#root-directory
    root: path.join(__dirname, '..'),
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
}

export default nextConfig
