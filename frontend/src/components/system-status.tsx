'use client'

import { LiveDot } from '@/components/ui/live-dot'
import { Chip } from '@/components/ui/chip'
import { Card, CardBody, CardText, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useSystemStatus } from '@/hooks/use-system-status'
import type { ServiceHealth, ServiceRow } from '@/lib/api'
import { cn } from '@/lib/utils'

const STATUS_COPY: Record<ServiceHealth, string> = {
  healthy: 'Healthy',
  degraded: 'Degraded',
  offline: 'Offline',
  unknown: 'Unknown',
  reconnecting: 'Reconnecting',
}

const STATUS_TONE: Record<ServiceHealth, 'default' | 'success' | 'danger' | 'special'> = {
  healthy: 'success',
  degraded: 'special',
  offline: 'danger',
  unknown: 'default',
  reconnecting: 'special',
}

/**
 * Live API / Redis / worker status. Never fabricates healthy values —
 * unknown, offline, degraded, and reconnecting are first-class states.
 */
export function SystemStatus({ className }: { className?: string }) {
  const { view, isPending, isError } = useSystemStatus()

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div
        className="grid gap-4 sm:grid-cols-3"
        aria-busy={isPending || view.reconnecting}
        aria-live="polite"
      >
        {view.services.map((service) => (
          <StatusCard key={service.id} service={service} />
        ))}
      </div>

      {isPending ? (
        <div className="flex flex-col gap-2" aria-hidden="true">
          <Skeleton className="h-3 w-72 max-w-full" />
          <Skeleton className="h-3 w-48 max-w-full" />
        </div>
      ) : null}

      {isError ? (
        <p className="text-xs leading-relaxed text-muted-foreground" role="status">
          {view.reconnecting
            ? 'Status temporarily unavailable, retrying…'
            : 'Live status unavailable or stale. Values stay unknown, offline, or last-reported until the API answers.'}
        </p>
      ) : null}

      {view.notes.length > 0 ? (
        <ul className="flex flex-col gap-1.5 text-xs leading-relaxed text-muted-foreground">
          {view.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function StatusCard({ service }: { service: ServiceRow }) {
  const label = STATUS_COPY[service.status]

  return (
    <Card>
      <CardBody className="gap-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">{service.label}</CardTitle>
          {service.status === 'healthy' ? (
            <LiveDot tone="success" aria-label={`${service.label}: ${label}`}>
              {label}
            </LiveDot>
          ) : service.status === 'reconnecting' ? (
            <LiveDot tone="special" aria-label={`${service.label}: ${label}`}>
              {label}
            </LiveDot>
          ) : (
            <Chip tone={STATUS_TONE[service.status]} aria-label={`${service.label}: ${label}`}>
              {label}
            </Chip>
          )}
        </div>
        <CardText className="line-clamp-none">{service.detail}</CardText>
      </CardBody>
    </Card>
  )
}
