import {
  ApiError,
  AvailableDemoPubSubChannels,
  DEMO_PUBSUB_RELATIVE_PREFIX,
  DEMO_REDIS_NAMESPACE,
  DemoEventEnum,
  ErrorCode,
  type DemoPubSubChannel,
  toPubSubRelativeChannel,
} from "@queuekit/shared";
import type { PubSubSubscription } from "@queuekit/redis-toolkit";
import { demoEvents } from "@/services/demo-events.service.js";
import {
  mapToolkitError,
  requireRedisInfrastructure,
} from "@/utils/toolkitErrors.js";
import logger from "@/logger/winston.logger.js";

const PUBSUB_LIMITATIONS = [
  "Redis Pub/Sub is fire-and-forget — messages are not stored.",
  "If nobody is subscribed at publish time, subscribers is 0 and the message is gone.",
  "Not a substitute for BullMQ jobs or Redis Streams.",
  "Demo channels only (lobby, lab). No wildcards / PSUBSCRIBE.",
  "Hosted Redis may sleep or restart; delivery is best-effort.",
] as const;

const MAX_SSE_LISTENERS = 40;

export type PubSubDemoMessage = {
  channel: DemoPubSubChannel;
  message: string;
  at: string;
};

type HubListener = (payload: PubSubDemoMessage) => void;

type PubSubHubState = {
  listeners: Set<HubListener>;
  subscription: PubSubSubscription | null;
  startPromise: Promise<void> | null;
};

const hub: PubSubHubState = {
  listeners: new Set(),
  subscription: null,
  startPromise: null,
};

export const listDemoPubSubChannels = (): {
  channels: DemoPubSubChannel[];
  relativePrefix: typeof DEMO_PUBSUB_RELATIVE_PREFIX;
  namespace: typeof DEMO_REDIS_NAMESPACE;
  limitations: string[];
} => ({
  channels: [...AvailableDemoPubSubChannels],
  relativePrefix: DEMO_PUBSUB_RELATIVE_PREFIX,
  namespace: DEMO_REDIS_NAMESPACE,
  limitations: [...PUBSUB_LIMITATIONS],
});

export const isAllowlistedPubSubChannel = (
  value: string
): value is DemoPubSubChannel =>
  AvailableDemoPubSubChannels.includes(value as DemoPubSubChannel);

/**
 * Publish on a real Redis channel (namespaced). Returns Redis subscriber count.
 */
export const publishDemoPubSub = async (input: {
  channel: DemoPubSubChannel;
  message: string;
}): Promise<{
  channel: DemoPubSubChannel;
  message: string;
  subscribers: number;
  limitations: string[];
}> => {
  const redis = requireRedisInfrastructure();
  try {
    const result = await redis.pubsub.publish(
      toPubSubRelativeChannel(input.channel),
      input.message
    );

    return {
      channel: input.channel,
      message: input.message,
      subscribers: result.subscribers,
      limitations: [...PUBSUB_LIMITATIONS],
    };
  } catch (error) {
    return mapToolkitError(error);
  }
};

/**
 * Process-level Redis subscriber (one duplicate connection) + in-process fan-out.
 * Refcounted: last SSE client closes the Redis subscriber.
 */
export const subscribeDemoPubSub = async (
  listener: HubListener
): Promise<() => Promise<void>> => {
  if (hub.listeners.size >= MAX_SSE_LISTENERS) {
    throw new ApiError(
      429,
      `Too many Pub/Sub listeners (max ${MAX_SSE_LISTENERS}). Close another tab and retry.`,
      [],
      "",
      ErrorCode.RATE_LIMITED
    );
  }

  hub.listeners.add(listener);
  try {
    await ensureHubSubscription();
  } catch (error) {
    hub.listeners.delete(listener);
    throw error;
  }

  return async () => {
    hub.listeners.delete(listener);
    if (hub.listeners.size === 0) {
      await teardownHubSubscription();
    }
  };
};

export const shutdownDemoPubSub = async (): Promise<void> => {
  hub.listeners.clear();
  await teardownHubSubscription();
};

const ensureHubSubscription = async (): Promise<void> => {
  if (hub.subscription) {
    return;
  }
  if (hub.startPromise) {
    await hub.startPromise;
    return;
  }

  hub.startPromise = (async () => {
    const redis = requireRedisInfrastructure();
    const relativeChannels = AvailableDemoPubSubChannels.map((channel) =>
      toPubSubRelativeChannel(channel)
    );

    hub.subscription = await redis.pubsub.subscribe(
      relativeChannels,
      (payload) => {
        const channel = relativeToAllowlisted(payload.channel);
        if (!channel) {
          return;
        }

        const message: PubSubDemoMessage = {
          channel,
          message: payload.message,
          at: new Date().toISOString(),
        };

        for (const listener of hub.listeners) {
          try {
            listener(message);
          } catch (error) {
            logger.warn("Pub/Sub SSE listener error", error);
          }
        }

        demoEvents.publish(DemoEventEnum.REDIS_PUBSUB_MESSAGE, {
          channel: message.channel,
          message: message.message,
        });
      }
    );
  })();

  try {
    await hub.startPromise;
  } finally {
    hub.startPromise = null;
  }
};

const teardownHubSubscription = async (): Promise<void> => {
  const current = hub.subscription;
  hub.subscription = null;
  if (!current) {
    return;
  }
  try {
    await current.close();
  } catch (error) {
    logger.warn("Pub/Sub subscriber teardown error", error);
  }
};

const relativeToAllowlisted = (
  relativeChannel: string
): DemoPubSubChannel | null => {
  if (!relativeChannel.startsWith(DEMO_PUBSUB_RELATIVE_PREFIX)) {
    return null;
  }
  const suffix = relativeChannel.slice(DEMO_PUBSUB_RELATIVE_PREFIX.length);
  return isAllowlistedPubSubChannel(suffix) ? suffix : null;
};

/** Test helper */
export const getPubSubHubListenerCount = (): number => hub.listeners.size;
