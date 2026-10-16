import type { Redis } from "ioredis";
import { ErrorCode } from "@queuekit/shared";
import { REDIS_BOUNDS } from "./bounds.js";
import { RedisToolkitError } from "./errors.js";
import type { NamespaceGuard } from "./namespace.js";

export const createTtlHelpers = (client: Redis, ns: NamespaceGuard) => {
  /**
   * Server-confirmed remaining TTL.
   * - `null` when key has no expiry
   * - throws NOT_FOUND when key is missing (TTL = -2)
   */
  const getRemainingTtl = async (suffix: string): Promise<number | null> => {
    const fullKey = ns.toFullKey(suffix);
    const ttl = await client.ttl(fullKey);
    if (ttl === -2) {
      throw new RedisToolkitError(
        `Key "${suffix}" not found`,
        ErrorCode.NOT_FOUND,
        404
      );
    }
    return ttl === -1 ? null : ttl;
  };

  const setExpire = async (
    suffix: string,
    ttlSeconds: number
  ): Promise<{ key: string; ttlSeconds: number }> => {
    if (
      !Number.isInteger(ttlSeconds) ||
      ttlSeconds < 1 ||
      ttlSeconds > REDIS_BOUNDS.MAX_TTL_SECONDS
    ) {
      throw new RedisToolkitError(
        `ttlSeconds must be 1–${REDIS_BOUNDS.MAX_TTL_SECONDS}`,
        ErrorCode.VALIDATION_FAILED
      );
    }

    const fullKey = ns.toFullKey(suffix);
    const ok = await client.expire(fullKey, ttlSeconds);
    if (ok !== 1) {
      throw new RedisToolkitError(
        `Key "${suffix}" not found`,
        ErrorCode.NOT_FOUND,
        404
      );
    }

    const remaining = await client.ttl(fullKey);
    return {
      key: suffix,
      ttlSeconds: remaining >= 0 ? remaining : ttlSeconds,
    };
  };

  return { getRemainingTtl, setExpire };
};

export type TtlHelpers = ReturnType<typeof createTtlHelpers>;
