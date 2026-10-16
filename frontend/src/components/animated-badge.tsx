'use client'

import { useReducedMotion } from 'motion/react'
import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Hero pill: optional orange glint on the border. Continuous motion is CSS-only
 * and gated with motion-safe. Reduced-motion users get a static pill.
 */
export function AnimatedBadge({ children, className }: { children: React.ReactNode; className?: string }) {
  const still = useReducedMotion() ?? false

  return (
    <span
      className={cn('relative inline-flex w-fit items-center justify-center overflow-hidden rounded-full p-px', className)}
    >
      {!still ? (
        <span
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 h-5 w-[300px] rounded-full bg-linear-to-r from-transparent via-transparent to-orange-500 motion-safe:animate-chai-spin"
          style={{ transform: 'translate(-50%, -50%)' }}
        />
      ) : null}
      <span className="relative z-10 rounded-full bg-neutral-50 px-4 py-2 text-sm font-medium text-neutral-800 dark:bg-stone-900 dark:text-neutral-100">
        {children}
      </span>
    </span>
  )
}
