import { Redis, type RedisOptions } from "ioredis";
import { ErrorCode } from "@queuekit/shared";
import { QueueToolkitError } from "./errors.js";

/**
 * BullMQ requires `maxRetriesPerRequest: null` on blocking connections.
 * Always create a dedicated connection per Queue / Worker / QueueEvents.
 */
export const createBullmqConnection = (
  url: string,
  redisOptions?: RedisOptions
): Redis => {
  if (!url?.trim()) {
    throw new QueueToolkitError(
      "Redis url is required for BullMQ connection",
      ErrorCode.VALIDATION_FAILED
    );
  }

  return new Redis(url.trim(), {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: false,
    ...redisOptions,
  });
};
