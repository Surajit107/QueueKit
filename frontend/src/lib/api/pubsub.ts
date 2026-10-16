import {
  AvailableDemoPubSubChannels,
  type DemoPubSubChannel,
} from '@queuekit/shared'

import { apiRequest } from '@/lib/api/client'
import { ApiClientError } from '@/lib/api/errors'
import { buildApiUrl } from '@/lib/api/config'

export type PubSubChannelsResponse = {
  channels: DemoPubSubChannel[]
  relativePrefix: string
  namespace: string
  limitations: string[]
}

export type PubSubPublishInput = {
  channel: DemoPubSubChannel
  message: string
}

export type PubSubPublishResult = {
  channel: DemoPubSubChannel
  message: string
  subscribers: number
  limitations: string[]
}

export type PubSubSseMessage = {
  type: 'redis.pubsub.message'
  at: string
  data: {
    channel: DemoPubSubChannel
    message: string
  }
}

export async function listPubSubChannels(
  signal?: AbortSignal,
): Promise<PubSubChannelsResponse> {
  const data = await apiRequest<unknown>('/api/v1/redis/demo/pubsub/channels', {
    method: 'GET',
    signal,
  })
  return parsePubSubChannelsResponse(data)
}

export async function publishPubSubMessage(
  input: PubSubPublishInput,
  signal?: AbortSignal,
): Promise<PubSubPublishResult> {
  const data = await apiRequest<unknown>('/api/v1/redis/demo/pubsub/publish', {
    method: 'POST',
    body: input,
    signal,
  })
  return parsePubSubPublishResult(data)
}

export function buildPubSubEventsUrl(channels?: DemoPubSubChannel[]): string | null {
  const params = new URLSearchParams()
  const list =
    channels && channels.length > 0 ? channels : [...AvailableDemoPubSubChannels]
  params.set('channels', list.join(','))
  return buildApiUrl(`/api/v1/redis/demo/pubsub/events?${params.toString()}`)
}

export function parsePubSubChannelsResponse(data: unknown): PubSubChannelsResponse {
  if (!isRecord(data) || !Array.isArray(data.channels) || !data.channels.every(isChannel)) {
    throw new ApiClientError('Pub/Sub channels payload was invalid.', { kind: 'parse' })
  }
  if (!isString(data.relativePrefix) || !isString(data.namespace)) {
    throw new ApiClientError('Pub/Sub channels metadata was invalid.', { kind: 'parse' })
  }
  if (!Array.isArray(data.limitations) || !data.limitations.every(isString)) {
    throw new ApiClientError('Pub/Sub limitations payload was invalid.', { kind: 'parse' })
  }
  return {
    channels: [...data.channels],
    relativePrefix: data.relativePrefix,
    namespace: data.namespace,
    limitations: [...data.limitations],
  }
}

export function parsePubSubPublishResult(data: unknown): PubSubPublishResult {
  if (
    !isRecord(data) ||
    !isChannel(data.channel) ||
    !isString(data.message) ||
    typeof data.subscribers !== 'number'
  ) {
    throw new ApiClientError('Pub/Sub publish payload was invalid.', { kind: 'parse' })
  }
  if (!Array.isArray(data.limitations) || !data.limitations.every(isString)) {
    throw new ApiClientError('Pub/Sub publish limitations were invalid.', { kind: 'parse' })
  }
  return {
    channel: data.channel,
    message: data.message,
    subscribers: data.subscribers,
    limitations: [...data.limitations],
  }
}

export function parsePubSubSseMessage(data: unknown): PubSubSseMessage | null {
  if (!isRecord(data) || data.type !== 'redis.pubsub.message' || !isString(data.at)) {
    return null
  }
  if (!isRecord(data.data) || !isChannel(data.data.channel) || !isString(data.data.message)) {
    return null
  }
  return {
    type: 'redis.pubsub.message',
    at: data.at,
    data: {
      channel: data.data.channel,
      message: data.data.message,
    },
  }
}

function isChannel(value: unknown): value is DemoPubSubChannel {
  return (
    typeof value === 'string' &&
    AvailableDemoPubSubChannels.includes(value as DemoPubSubChannel)
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}
