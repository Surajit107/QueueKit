'use client'

import { Database, Gauge, KeyRound, LayoutDashboard, Radio } from 'lucide-react'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

import { AppLink } from '@/components/app-link'
import { cn } from '@/lib/utils'

const LAB_LINKS: ReadonlyArray<{
  href: string
  label: string
  icon: ReactNode
  exact?: boolean
}> = [
  { href: '/playground', label: 'Overview', icon: <LayoutDashboard />, exact: true },
  { href: '/playground/keys', label: 'Keys', icon: <KeyRound /> },
  { href: '/playground/cache', label: 'Cache', icon: <Database /> },
  { href: '/playground/limits', label: 'Limits', icon: <Gauge /> },
  { href: '/playground/pubsub', label: 'Pub/Sub', icon: <Radio /> },
]

export function LabNav({ className }: { className?: string }) {
  const pathname = usePathname()

  return (
    <nav aria-label="Redis Lab sections" className={cn('flex flex-wrap gap-2', className)}>
      {LAB_LINKS.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname === link.href || pathname.startsWith(`${link.href}/`)
        return (
          <AppLink
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 [&_svg]:size-3.5',
              active
                ? 'border-foreground/25 bg-foreground/5 text-foreground'
                : 'border-card-edge text-muted-foreground hover:border-card-edge-hover hover:text-foreground',
            )}
          >
            <span aria-hidden="true">{link.icon}</span>
            {link.label}
          </AppLink>
        )
      })}
    </nav>
  )
}
