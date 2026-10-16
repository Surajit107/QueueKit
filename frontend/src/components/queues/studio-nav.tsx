'use client'

import { Cpu, LayoutDashboard, ListTodo } from 'lucide-react'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

import { AppLink } from '@/components/app-link'
import { cn } from '@/lib/utils'

const LINKS: ReadonlyArray<{
  href: string
  label: string
  icon: ReactNode
  exact?: boolean
}> = [
  { href: '/queues', label: 'Overview', icon: <LayoutDashboard />, exact: true },
  { href: '/queues/jobs', label: 'Jobs', icon: <ListTodo /> },
  { href: '/queues/workers', label: 'Workers', icon: <Cpu /> },
]

export function StudioNav({ className }: { className?: string }) {
  const pathname = usePathname()

  return (
    <nav aria-label="Queue Studio sections" className={cn('flex flex-wrap gap-2', className)}>
      {LINKS.map((link) => {
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
