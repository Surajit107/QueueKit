'use client'

import * as React from 'react'

import { IconButton } from '@/components/ui/icon-button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * ChaiUI IconButton with a hover/focus tooltip. Use for toolbar row actions
 * (refresh, delete, inspect) where the label must not depend on the tooltip.
 */
export function ActionIcon({
  label,
  variant = 'ghost',
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof IconButton>, 'aria-label' | 'variant'> & {
  label: string
  variant?: 'boxed' | 'ghost'
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <IconButton aria-label={label} variant={variant} className={cn(className)} {...props}>
          {children}
        </IconButton>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
