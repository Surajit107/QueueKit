import type { Redis } from "ioredis";
import { ErrorCode } from "@queuekit/shared";
import { REDIS_BOUNDS } from "./bounds.js";
import { RedisToolkitError } from "./errors.js";
import type { NamespaceGuard } from "./namespace.js";
import type { RateLimitResult } from "./types.js";

export type RateLimitOptions = {
  /** Max events allowed inside the window. */
  limit: number;
  /** Sliding window size in milliseconds. */
  windowMs: number;
};

/**
 * Sliding-window rate limiter using a sorted set of event timestamps.
 * Scope is whatever suffix the caller chooses (IP, session, demo bucket).
 */
export const createRateLimitHelpers = (client: Redis, ns: NamespaceGuard) => {
  const consume = async (
    suffix: string,
    options: RateLimitOptions
  ): Promise<RateLimitResult> => {
    const { limit, windowMs } = options;

    if (
      !Number.isInteger(limit) ||
      limit < REDIS_BOUNDS.MIN_RATE_LIMIT ||
      limit > REDIS_BOUNDS.MAX_RATE_LIMIT
    ) {
      throw new RedisToolkitError(
        `limit must be ${REDIS_BOUNDS.MIN_RATE_LIMIT}–${REDIS_BOUNDS.MAX_RATE_LIMIT}`,
        ErrorCode.VALIDATION_FAILED
      );
    }
    if (
      !Number.isInteger(windowMs) ||
      windowMs < REDIS_BOUNDS.MIN_RATE_WINDOW_MS ||
      windowMs > REDIS_BOUNDS.MAX_RATE_WINDOW_MS
    ) {
      throw new RedisToolkitError(
        `windowMs must be ${REDIS_BOUNDS.MIN_RATE_WINDOW_MS}–${REDIS_BOUNDS.MAX_RATE_WINDOW_MS}`,
        ErrorCode.VALIDATION_FAILED
      );
    }

    const fullKey = ns.toFullKey(suffix);
    const now = Date.now();
    const windowStart = now - windowMs;
    const member = `${now}:${Math.random().toString(36).slice(2, 10)}`;

    const pipeline = client.multi();
    pipeline.zremrangebyscore(fullKey, 0, windowStart);
    pipeline.zadd(fullKey, now, member);
    pipeline.zcard(fullKey);
    pipeline.pexpire(fullKey, windowMs);

    const results = await pipeline.exec();
    if (!results) {
      throw new RedisToolkitError(
        "Rate-limit pipeline failed",
        ErrorCode.INTERNAL,
        500
      );
    }

    const zcardResult = results[2];
    const count =
      zcardResult && zcardResult[0] === null
        ? Number(zcardResult[1])
        : Number.NaN;

    if (!Number.isFinite(count)) {
      throw new RedisToolkitError(
        "Rate-limit count unavailable",
        ErrorCode.INTERNAL,
        500
      );
    }

    const allowed = count <= limit;
    if (!allowed) {
      // Roll back the just-added member so denied requests do not consume quota.
      await client.zrem(fullKey, member);
    }

    const remaining = Math.max(0, limit - (allowed ? count : count - 1));

    return {
      allowed,
      limit,
      remaining,
      windowMs,
      retryAfterMs: allowed ? null : windowMs,
    };
  };

  return { consume };
};

export type RateLimitHelpers = ReturnType<typeof createRateLimitHelpers>;
