import * as React from 'react'

import { cn } from '@/lib/utils'

export function DocSection({
  id,
  title,
  children,
  className,
}: {
  id?: string
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-heading` : undefined} className={cn('flex flex-col gap-3', className)}>
      <h3
        id={id ? `${id}-heading` : undefined}
        className="font-montserrat text-lg font-semibold text-foreground"
      >
        {title}
      </h3>
      {children}
    </section>
  )
}

export function DocP({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn('max-w-3xl text-base leading-relaxed text-muted-foreground', className)}>
      {children}
    </p>
  )
}

export function DocList({ items }: { items: ReadonlyArray<React.ReactNode> }) {
  return (
    <ul className="max-w-3xl list-disc space-y-1.5 pl-5 text-base leading-relaxed text-muted-foreground">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  )
}

export function DocCode({ children, className }: { children: string; className?: string }) {
  return (
    <pre
      className={cn(
        'overflow-x-auto rounded-lg border border-card-edge bg-black/5 p-3 font-mono text-xs leading-relaxed dark:bg-white/5',
        className,
      )}
    >
      <code>{children}</code>
    </pre>
  )
}

export function DocInlineCode({ children }: { children: React.ReactNode }) {
  return <code className="rounded border border-card-edge bg-black/5 px-1 py-0.5 font-mono text-xs dark:bg-white/5">{children}</code>
}
