'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, Save, Search, Trash2 } from 'lucide-react'
import * as React from 'react'

import { ActionError } from '@/components/playground/action-error'
import { LabShell } from '@/components/playground/lab-shell'
import { ActionIcon } from '@/components/ui/action-icon'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardText, CardTitle } from '@/components/ui/card'
import { Chip } from '@/components/ui/chip'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  createDemoKey,
  deleteDemoKey,
  getDemoKey,
  listDemoKeys,
  type DemoKeyRecord,
} from '@/lib/api'
import {
  DEMO_NAMESPACE_LABEL,
  formatTtl,
  validateDemoKeySuffix,
  validateDemoValue,
  validateOptionalTtl,
} from '@/lib/redis-demo'
import { redisQueryKeys } from '@/lib/query-client'

export function KeysLab() {
  const queryClient = useQueryClient()
  const [key, setKey] = React.useState('')
  const [value, setValue] = React.useState('')
  const [ttl, setTtl] = React.useState('')
  const [formError, setFormError] = React.useState<string | null>(null)
  const [inspected, setInspected] = React.useState<DemoKeyRecord | null>(null)
  const [inspectKey, setInspectKey] = React.useState('')

  const keysQuery = useQuery({
    queryKey: redisQueryKeys.keys(),
    queryFn: ({ signal }) => listDemoKeys(signal),
  })

  const createMutation = useMutation({
    mutationFn: (input: Parameters<typeof createDemoKey>[0]) => createDemoKey(input),
    onSuccess: async (record) => {
      setInspected(record)
      setInspectKey(record.key)
      setFormError(null)
      await queryClient.invalidateQueries({ queryKey: redisQueryKeys.keys() })
    },
  })

  const inspectMutation = useMutation({
    mutationFn: (suffix: string) => getDemoKey(suffix),
    onSuccess: (record) => {
      setInspected(record)
      setFormError(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (suffix: string) => deleteDemoKey(suffix),
    onSuccess: async (result) => {
      if (inspected?.key === result.key) {
        setInspected(null)
      }
      await queryClient.invalidateQueries({ queryKey: redisQueryKeys.keys() })
    },
  })

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const keyError = validateDemoKeySuffix(key)
    if (keyError) {
      setFormError(keyError)
      return
    }
    const valueError = validateDemoValue(value)
    if (valueError) {
      setFormError(valueError)
      return
    }
    const ttlResult = validateOptionalTtl(ttl)
    if (!ttlResult.ok) {
      setFormError(ttlResult.error)
      return
    }

    setFormError(null)
    createMutation.mutate({
      key: key.trim(),
      value,
      ...(ttlResult.value !== undefined ? { ttlSeconds: ttlResult.value } : {}),
    })
  }

  function onInspect(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const keyError = validateDemoKeySuffix(inspectKey)
    if (keyError) {
      setFormError(keyError)
      return
    }
    setFormError(null)
    inspectMutation.mutate(inspectKey.trim())
  }

  const mutationError =
    createMutation.error ?? inspectMutation.error ?? deleteMutation.error

  return (
    <LabShell
      title="Keys and TTL"
      lead="Set, get, delete, and inspect allowlisted demo keys with server-confirmed TTL."
      highlight="server-confirmed TTL"
    >
      <Alert tone="info" title="Suffixes only">
        Enter the key suffix. Stored as <code className="font-mono text-xs">{DEMO_NAMESPACE_LABEL}</code>
        + suffix. TTL values come from the API after write or read — never invented client-side.
      </Alert>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardBody className="gap-4">
            <CardTitle>Set key</CardTitle>
            <CardText className="line-clamp-none">
              Creates or updates a namespaced demo string key.
            </CardText>
            <form className="flex flex-col gap-3" onSubmit={onSubmit} noValidate>
              <Field label="Key suffix" htmlFor="demo-key">
                <Input
                  id="demo-key"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="example:user:1"
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={Boolean(formError) || undefined}
                />
              </Field>
              <Field label="Value" htmlFor="demo-value">
                <Input
                  id="demo-value"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="hello"
                  autoComplete="off"
                />
              </Field>
              <Field label="TTL seconds (optional)" htmlFor="demo-ttl">
                <Input
                  id="demo-ttl"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={86_400}
                  value={ttl}
                  onChange={(e) => setTtl(e.target.value)}
                  placeholder="e.g. 60"
                />
              </Field>
              {formError ? (
                <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                  {formError}
                </p>
              ) : null}
              <Button
                type="submit"
                variant="solid"
                iconLeft={<Save />}
                iconRight={null}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? 'Saving…' : 'Set key'}
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="gap-4">
            <CardTitle>Inspect key</CardTitle>
            <CardText className="line-clamp-none">
              Fetch value and remaining TTL confirmed by Redis via the API.
            </CardText>
            <form className="flex flex-col gap-3" onSubmit={onInspect} noValidate>
              <Field label="Key suffix" htmlFor="inspect-key">
                <Input
                  id="inspect-key"
                  value={inspectKey}
                  onChange={(e) => setInspectKey(e.target.value)}
                  placeholder="example:user:1"
                  autoComplete="off"
                  spellCheck={false}
                />
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  variant="soft"
                  iconLeft={<Search />}
                  iconRight={null}
                  disabled={inspectMutation.isPending}
                >
                  {inspectMutation.isPending ? 'Loading…' : 'Get'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  iconLeft={<Trash2 />}
                  iconRight={null}
                  disabled={!inspectKey.trim() || deleteMutation.isPending}
                  onClick={() => {
                    const keyError = validateDemoKeySuffix(inspectKey)
                    if (keyError) {
                      setFormError(keyError)
                      return
                    }
                    setFormError(null)
                    deleteMutation.mutate(inspectKey.trim())
                  }}
                >
                  {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
                </Button>
              </div>
            </form>

            {inspected ? (
              <div className="mt-2 space-y-2 rounded-lg border border-card-edge p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-montserrat font-semibold">{inspected.key}</span>
                  <Chip tone="default">string</Chip>
                  <Chip tone={inspected.ttlSeconds === null ? 'default' : 'special'}>
                    TTL {formatTtl(inspected.ttlSeconds)}
                  </Chip>
                </div>
                <p className="break-words text-muted-foreground">
                  <span className="text-foreground">Value:</span> {inspected.value}
                </p>
              </div>
            ) : null}
          </CardBody>
        </Card>
      </div>

      <section aria-labelledby="keys-list-heading" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h3 id="keys-list-heading" className="font-montserrat text-sm font-semibold">
            Demo keys
          </h3>
          <ActionIcon
            label={keysQuery.isFetching ? 'Refreshing…' : 'Refresh'}
            onClick={() => void keysQuery.refetch()}
            disabled={keysQuery.isFetching}
          >
            <RefreshCw className={keysQuery.isFetching ? 'motion-safe:animate-spin' : undefined} />
          </ActionIcon>
        </div>

        {keysQuery.isPending ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : keysQuery.isError ? (
          <ActionError error={keysQuery.error} title="Could not list keys" />
        ) : keysQuery.data.keys.length === 0 ? (
          <p className="text-sm text-muted-foreground">No demo keys yet.</p>
        ) : (
          <ul className="divide-y divide-card-edge rounded-xl border border-card-edge">
            {keysQuery.data.keys.map((suffix) => (
              <li
                key={suffix}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm"
              >
                <code className="font-mono text-xs">{suffix}</code>
                <div className="flex gap-0.5">
                  <ActionIcon
                    label="Inspect"
                    onClick={() => {
                      setInspectKey(suffix)
                      inspectMutation.mutate(suffix)
                    }}
                  >
                    <Search />
                  </ActionIcon>
                  <ActionIcon
                    label="Delete"
                    onClick={() => deleteMutation.mutate(suffix)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 />
                  </ActionIcon>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {mutationError ? <ActionError error={mutationError} title="Redis action failed" /> : null}
    </LabShell>
  )
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  )
}
