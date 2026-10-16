import type { Redis } from "ioredis";
import { ErrorCode } from "@queuekit/shared";
import { REDIS_BOUNDS } from "./bounds.js";
import { RedisToolkitError } from "./errors.js";
import type { NamespaceGuard } from "./namespace.js";
import type { RedisLogger } from "./types.js";

export type PubSubMessage = {
  /** Relative channel suffix (e.g. pubsub:lobby). */
  channel: string;
  fullChannel: string;
  message: string;
};

export type PubSubPublishResult = {
  channel: string;
  fullChannel: string;
  /** Redis PUBLISH return value — receivers at publish time (0 = dropped). */
  subscribers: number;
};

export type PubSubSubscription = {
  channels: string[];
  close: () => Promise<void>;
};

export type PubSubHelpers = {
  toFullChannel: (relativeChannel: string) => string;
  publish: (
    relativeChannel: string,
    message: string
  ) => Promise<PubSubPublishResult>;
  /**
   * Subscribe via a dedicated `duplicate()` connection — never the command client.
   * Caller must `close()` to unsubscribe and quit the subscriber.
   */
  subscribe: (
    relativeChannels: string[],
    onMessage: (payload: PubSubMessage) => void
  ) => Promise<PubSubSubscription>;
};

const assertMessage = (message: string): void => {
  if (typeof message !== "string" || message.length === 0) {
    throw new RedisToolkitError(
      "Pub/Sub message must be a non-empty string",
      ErrorCode.VALIDATION_FAILED
    );
  }
  if (message.length > REDIS_BOUNDS.MAX_PUBSUB_MESSAGE_BYTES) {
    throw new RedisToolkitError(
      `Pub/Sub message must be at most ${REDIS_BOUNDS.MAX_PUBSUB_MESSAGE_BYTES} characters`,
      ErrorCode.VALIDATION_FAILED
    );
  }
};

/**
 * Namespaced Redis Pub/Sub helpers.
 * PUBLISH uses the shared command client; SUBSCRIBE always uses duplicate().
 */
export const createPubSubHelpers = (
  client: Redis,
  ns: NamespaceGuard,
  logger?: RedisLogger
): PubSubHelpers => {
  const toFullChannel = (relativeChannel: string): string =>
    ns.toFullKey(relativeChannel);

  const publish = async (
    relativeChannel: string,
    message: string
  ): Promise<PubSubPublishResult> => {
    assertMessage(message);
    const fullChannel = toFullChannel(relativeChannel);
    try {
      const subscribers = await client.publish(fullChannel, message);
      return { channel: relativeChannel, fullChannel, subscribers };
    } catch (error) {
      logger?.error?.("Redis PUBLISH failed", error);
      throw new RedisToolkitError(
        "Failed to publish Redis Pub/Sub message",
        ErrorCode.DEPENDENCY_UNAVAILABLE,
        503
      );
    }
  };

  const subscribe = async (
    relativeChannels: string[],
    onMessage: (payload: PubSubMessage) => void
  ): Promise<PubSubSubscription> => {
    if (relativeChannels.length === 0) {
      throw new RedisToolkitError(
        "At least one Pub/Sub channel is required",
        ErrorCode.VALIDATION_FAILED
      );
    }
    if (relativeChannels.length > REDIS_BOUNDS.MAX_PUBSUB_CHANNELS_PER_SUB) {
      throw new RedisToolkitError(
        `At most ${REDIS_BOUNDS.MAX_PUBSUB_CHANNELS_PER_SUB} channels per subscription`,
        ErrorCode.VALIDATION_FAILED
      );
    }

    const unique = [...new Set(relativeChannels)];
    const fullChannels = unique.map((channel) => toFullChannel(channel));
    const relativeByFull = new Map(
      fullChannels.map((full, index) => [full, unique[index]!] as const)
    );

    const subscriber = client.duplicate();
    let closed = false;

    const handler = (fullChannel: string, message: string): void => {
      const channel = relativeByFull.get(fullChannel);
      if (!channel) {
        return;
      }
      onMessage({ channel, fullChannel, message });
    };

    try {
      if (subscriber.status === "wait") {
        await subscriber.connect();
      }
      subscriber.on("message", handler);
      await subscriber.subscribe(...fullChannels);
      logger?.info?.(
        `Redis Pub/Sub subscribed (${unique.length} channel(s)) via dedicated connection`
      );
    } catch (error) {
      subscriber.off("message", handler);
      try {
        subscriber.disconnect();
      } catch {
        /* ignore */
      }
      logger?.error?.("Redis SUBSCRIBE failed", error);
      throw new RedisToolkitError(
        "Failed to subscribe to Redis Pub/Sub channels",
        ErrorCode.DEPENDENCY_UNAVAILABLE,
        503
      );
    }

    return {
      channels: unique,
      close: async () => {
        if (closed) {
          return;
        }
        closed = true;
        subscriber.off("message", handler);
        try {
          await subscriber.unsubscribe(...fullChannels);
          await subscriber.quit();
        } catch {
          try {
            subscriber.disconnect();
          } catch {
            /* ignore */
          }
        }
        logger?.info?.("Redis Pub/Sub subscriber closed");
      },
    };
  };

  return { toFullChannel, publish, subscribe };
};
