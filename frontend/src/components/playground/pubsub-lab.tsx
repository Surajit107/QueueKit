'use client'

import {
  AvailableDemoPubSubChannels,
  type DemoPubSubChannel,
} from '@queuekit/shared'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Eraser, Radio, Send, Square } from 'lucide-react'
import * as React from 'react'

import { ActionError } from '@/components/playground/action-error'
import { LabShell } from '@/components/playground/lab-shell'
import { usePubSubEvents } from '@/hooks/use-pubsub-events'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardText, CardTitle } from '@/components/ui/card'
import { Chip } from '@/components/ui/chip'
import { Input } from '@/components/ui/input'
import {
  listPubSubChannels,
  publishPubSubMessage,
  type PubSubPublishResult,
} from '@/lib/api/pubsub'

const MESSAGE_MAX = 256

export function PubSubLab() {
  const [channel, setChannel] = React.useState<DemoPubSubChannel>('lobby')
  const [message, setMessage] = React.useState('hello from QueueKit')
  const [formError, setFormError] = React.useState<string | null>(null)
  const [lastPublish, setLastPublish] = React.useState<PubSubPublishResult | null>(null)

  const listenChannels = React.useMemo(
    () => [...AvailableDemoPubSubChannels],
    [],
  )

  const channelsQuery = useQuery({
    queryKey: ['redis', 'pubsub', 'channels'],
    queryFn: ({ signal }) => listPubSubChannels(signal),
  })

  const stream = usePubSubEvents(listenChannels)

  const publishMutation = useMutation({
    mutationFn: (input: { channel: DemoPubSubChannel; message: string }) =>
      publishPubSubMessage(input),
    onSuccess: (result) => {
      setLastPublish(result)
      setFormError(null)
    },
  })

  function onPublish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = message.trim()
    if (!trimmed) {
      setFormError('Message is required.')
      return
    }
    if (trimmed.length > MESSAGE_MAX) {
      setFormError(`Message must be at most ${MESSAGE_MAX} characters.`)
      return
    }
    setFormError(null)
    publishMutation.mutate({ channel, message: trimmed })
  }

  const connectionChip =
    stream.state === 'connected'
      ? { tone: 'success' as const, label: 'Listening' }
      : stream.state === 'connecting'
        ? { tone: 'special' as const, label: 'Connecting' }
        : stream.state === 'error'
          ? { tone: 'danger' as const, label: 'Offline' }
          : { tone: 'default' as const, label: stream.state === 'closed' ? 'Stopped' : 'Idle' }

  return (
    <LabShell
      title="Pub/Sub"
      lead="Publish and subscribe on allowlisted Redis channels with explicit fire-and-forget limits."
      highlight="fire-and-forget limits"
    >
      <Alert tone="warning" title="Not durable">
        Redis Pub/Sub does not store messages. If nobody is subscribed when you publish,{' '}
        <code className="font-mono text-xs">subscribers</code> is 0 and the message is gone. This is
        not BullMQ and not Streams.
      </Alert>

      {channelsQuery.data ? (
        <Alert tone="info" title="Allowlisted channels">
          {channelsQuery.data.channels.map((name) => (
            <Chip key={name} className="mr-1.5 mt-1">
              {channelsQuery.data.namespace}
              {channelsQuery.data.relativePrefix}
              {name}
            </Chip>
          ))}
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardBody className="gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Subscribe (SSE)</CardTitle>
              <Chip tone={connectionChip.tone}>{connectionChip.label}</Chip>
            </div>
            <CardText className="line-clamp-none">
              Opens an SSE bridge to a process-level Redis <code className="font-mono text-xs">SUBSCRIBE</code>{' '}
              on a dedicated <code className="font-mono text-xs">duplicate()</code> connection — never the
              shared command client.
            </CardText>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="solid"
                iconLeft={<Radio />}
                iconRight={null}
                disabled={stream.isListening}
                onClick={() => stream.start()}
              >
                {stream.state === 'connecting' ? 'Connecting…' : 'Start listening'}
              </Button>
              <Button
                variant="outline"
                iconLeft={<Square />}
                iconRight={null}
                disabled={!stream.isListening && stream.state !== 'error'}
                onClick={() => stream.stop()}
              >
                Stop
              </Button>
              <Button
                variant="ghost"
                iconLeft={<Eraser />}
                iconRight={null}
                onClick={() => stream.clearMessages()}
              >
                Clear feed
              </Button>
            </div>

            {stream.error ? (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {stream.error}
              </p>
            ) : null}

            <ul className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-card-edge p-3 text-sm">
              {stream.messages.length === 0 ? (
                <li className="text-muted-foreground">No messages yet. Start listening, then publish.</li>
              ) : (
                stream.messages.map((entry) => (
                  <li
                    key={`${entry.at}-${entry.data.channel}-${entry.data.message}`}
                    className="rounded-md border border-card-edge/60 px-2.5 py-2"
                  >
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <Chip tone="special">{entry.data.channel}</Chip>
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.at).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="break-words">{entry.data.message}</p>
                  </li>
                ))
              )}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="gap-4">
            <CardTitle>Publish</CardTitle>
            <CardText className="line-clamp-none">
              Calls Redis <code className="font-mono text-xs">PUBLISH</code> on the command connection.
              The returned subscriber count is honest — 0 means nobody received it.
            </CardText>
            <form className="flex flex-col gap-3" onSubmit={onPublish} noValidate>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="pubsub-channel" className="text-sm text-muted-foreground">
                  Channel
                </label>
                <select
                  id="pubsub-channel"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as DemoPubSubChannel)}
                  className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 dark:border-gray-800 dark:bg-black/50"
                >
                  {AvailableDemoPubSubChannels.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="pubsub-message" className="text-sm text-muted-foreground">
                  Message
                </label>
                <Input
                  id="pubsub-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={MESSAGE_MAX}
                  autoComplete="off"
                />
              </div>
              {formError ? (
                <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                  {formError}
                </p>
              ) : null}
              <Button
                type="submit"
                variant="soft"
                iconLeft={<Send />}
                iconRight={null}
                disabled={publishMutation.isPending}
              >
                {publishMutation.isPending ? 'Publishing…' : 'Publish'}
              </Button>
            </form>

            {lastPublish ? (
              <div className="space-y-2 rounded-lg border border-card-edge p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Chip tone={lastPublish.subscribers > 0 ? 'success' : 'danger'}>
                    subscribers {lastPublish.subscribers}
                  </Chip>
                  <Chip>{lastPublish.channel}</Chip>
                </div>
                <p className="break-words text-muted-foreground">
                  <span className="text-foreground">Sent:</span> {lastPublish.message}
                </p>
                {lastPublish.subscribers === 0 ? (
                  <p className="text-xs text-amber-700 dark:text-amber-200">
                    No active Redis subscribers at publish time — message discarded.
                  </p>
                ) : null}
              </div>
            ) : null}
          </CardBody>
        </Card>
      </div>

      {(channelsQuery.data?.limitations ?? stream.limitations).length > 0 ? (
        <ul className="flex flex-col gap-1.5 text-xs leading-relaxed text-muted-foreground">
          {(channelsQuery.data?.limitations ?? stream.limitations).map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}

      {channelsQuery.isError ? (
        <ActionError error={channelsQuery.error} title="Could not load Pub/Sub channels" />
      ) : null}
      {publishMutation.isError ? (
        <ActionError error={publishMutation.error} title="Publish failed" />
      ) : null}
    </LabShell>
  )
}
