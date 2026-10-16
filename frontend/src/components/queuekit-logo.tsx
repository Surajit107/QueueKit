import { cn } from '@/lib/utils'

/**
 * QueueKit wordmark. Uses the ChaiUI Onest brand font, not the ChaiCode cup.
 */
export function QueueKitLogo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-baseline gap-1.5 font-onest', className)}>
      <span className="text-xl font-medium tracking-tight text-foreground">QueueKit</span>
      <span className="hidden text-[11px] font-medium tracking-tight text-muted-foreground sm:inline">
        by AsterIQ
      </span>
    </span>
  )
}
