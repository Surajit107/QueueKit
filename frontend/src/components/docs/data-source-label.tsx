import { Chip } from '@/components/ui/chip'

import { cn } from '@/lib/utils'

export type DataSourceKind = 'live-api' | 'demo-session' | 'simulated'

const SOURCE_META: Record<DataSourceKind, { label: string; tone: 'success' | 'special' }> = {
  'live-api': { label: 'live from API', tone: 'success' },
  'demo-session': { label: 'demo only', tone: 'special' },
  simulated: { label: 'simulated', tone: 'special' },
}

/** Labels live service results vs session demo metrics vs simulated comparison data. */
export function DataSourceChip({
  source,
  className,
}: {
  source: DataSourceKind
  className?: string
}) {
  const meta = SOURCE_META[source]
  return (
    <Chip tone={meta.tone} className={cn(className)}>
      {meta.label}
    </Chip>
  )
}
