'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import * as React from 'react'

import { createQueryClient } from '@/lib/query-client'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(() => createQueryClient())

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
