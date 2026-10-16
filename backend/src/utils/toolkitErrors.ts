import type { RedisInfrastructure } from "@queuekit/redis-toolkit";
import { RedisToolkitError } from "@queuekit/redis-toolkit";
import type { QueueInfrastructure } from "@queuekit/queue-toolkit";
import { QueueToolkitError } from "@queuekit/queue-toolkit";
import { ApiError, ErrorCode } from "@queuekit/shared";
import {
  getRedisInfrastructure,
  isRedisReady,
} from "@/cache/redis.js";
import { getQueueInfrastructure } from "@/queues/index.js";

/**
 * Map toolkit domain errors to HTTP ApiError responses.
 */
export const mapToolkitError = (error: unknown): never => {
  if (
    error instanceof RedisToolkitError ||
    error instanceof QueueToolkitError
  ) {
    throw new ApiError(
      error.statusHint,
      error.message,
      [],
      "",
      error.code
    );
  }
  throw error;
};

export const requireRedisInfrastructure = (): RedisInfrastructure => {
  const infra = getRedisInfrastructure();
  if (!infra || !isRedisReady()) {
    throw new ApiError(
      503,
      "Redis is unavailable",
      [],
      "",
      ErrorCode.DEPENDENCY_UNAVAILABLE
    );
  }
  return infra;
};

export const requireQueueInfrastructure = (): QueueInfrastructure => {
  const infra = getQueueInfrastructure();
  if (!infra) {
    throw new ApiError(
      503,
      "Queue infrastructure is unavailable",
      [],
      "",
      ErrorCode.DEPENDENCY_UNAVAILABLE
    );
  }
  return infra;
};
