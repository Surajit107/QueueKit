'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { RotateCcw } from 'lucide-react'
import * as React from 'react'

import { ActionError } from '@/components/playground/action-error'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { getErrorMessage, resetDemoResources, type DemoResetResult } from '@/lib/api'
import { DEMO_NAMESPACE_LABEL } from '@/lib/redis-demo'
import { queueQueryKeys, redisQueryKeys, statusQueryKeys } from '@/lib/query-client'

/**
 * Destructive demo reset — confirmation required; namespaced Redis + demo queues only.
 */
export function ResetDemoControl({ className }: { className?: string }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = React.useState(false)
  const [result, setResult] = React.useState<DemoResetResult | null>(null)

  const mutation = useMutation({
    mutationFn: () => resetDemoResources(),
    onSuccess: async (data) => {
      setResult(data)
      setOpen(false)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: redisQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: queueQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: statusQueryKeys.all }),
      ])
    },
  })

  return (
    <div className={className}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl space-y-1">
          <h3 className="font-montserrat text-sm font-semibold text-foreground">Reset demo data</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Deletes only keys under <code className="font-mono text-xs">{DEMO_NAMESPACE_LABEL}</code>{' '}
            and clears allowlisted demo queues. Requires explicit confirmation.
          </p>
        </div>
        <Button
          variant="outline"
          iconLeft={<RotateCcw />}
          iconRight={null}
          onClick={() => {
            setResult(null)
            mutation.reset()
            setOpen(true)
          }}
        >
          Reset demo
        </Button>
      </div>

      {result ? (
        <Alert tone="success" title="Demo reset complete" className="mt-4">
          Removed {result.deletedKeys} key{result.deletedKeys === 1 ? '' : 's'} under{' '}
          <code className="font-mono text-xs">{result.prefix}</code>
          {result.queuesReset.length > 0
            ? `. Queues reset: ${result.queuesReset.join(', ')}.`
            : '.'}
        </Alert>
      ) : null}

      {mutation.isError && !open ? (
        <div className="mt-4">
          <ActionError error={mutation.error} title="Reset failed" />
        </div>
      ) : null}

      <ConfirmDialog
        open={open}
        title="Reset namespaced demo data?"
        confirmLabel="Reset demo"
        busyLabel="Resetting"
        typeToConfirm="RESET"
        busy={mutation.isPending}
        error={mutation.isError ? getErrorMessage(mutation.error) : null}
        onCancel={() => {
          if (!mutation.isPending) {
            setOpen(false)
            mutation.reset()
          }
        }}
        onConfirm={() => {
          mutation.mutate()
        }}
      >
        <p>
          This clears Redis keys under <strong>{DEMO_NAMESPACE_LABEL}</strong> and allowlisted demo
          queues only. It cannot be undone. Production data outside that namespace is not touched.
        </p>
      </ConfirmDialog>
    </div>
  )
}
