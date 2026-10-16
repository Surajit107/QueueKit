import { ArrowRight } from 'lucide-react'

import { cn } from '@/lib/utils'

const STEPS = ['API', 'Queue', 'Worker', 'Redis'] as const

/**
 * Abstract Redis/queue flow for the hero media slot: one central element.
 */
export function FlowVisual({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'card-chai flex aspect-[4/3] w-full flex-col items-center justify-center gap-6 p-6 sm:p-8',
        className,
      )}
      aria-hidden="true"
    >
      <p className="font-montserrat text-xs font-medium tracking-tight text-muted-foreground uppercase">
        Request path
      </p>
      <ol className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        {STEPS.map((step, index) => (
          <li key={step} className="flex items-center gap-2 sm:gap-3">
            <span className="inline-flex h-10 items-center rounded-md border border-card-edge bg-card-fill px-3 font-montserrat text-sm font-semibold text-foreground">
              {step}
            </span>
            {index < STEPS.length - 1 && (
              <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
            )}
          </li>
        ))}
      </ol>
      <p className="max-w-xs text-center text-xs leading-relaxed text-muted-foreground">
        Enqueue on the API, process in the worker, inspect state in Redis.
      </p>
    </div>
  )
}
