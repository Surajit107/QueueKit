import type { Redis } from "ioredis";
import { ErrorCode } from "@queuekit/shared";
import { REDIS_BOUNDS } from "./bounds.js";
import { RedisToolkitError } from "./errors.js";
import type { NamespaceGuard } from "./namespace.js";
import type { CacheAsideResult } from "./types.js";

export type CacheAsideOptions = {
  ttlSeconds?: number;
  serialize?: (value: unknown) => string;
  deserialize?: (raw: string) => unknown;
};

const defaultSerialize = (value: unknown): string => JSON.stringify(value);
const defaultDeserialize = (raw: string): unknown => JSON.parse(raw) as unknown;

/**
 * Cache-aside: read cache → on miss call loader → write cache.
 * Metrics (hit/miss, latency) are returned to the caller — not invented.
 */
export const createCacheAsideHelpers = (client: Redis, ns: NamespaceGuard) => {
  const getOrLoad = async <T>(
    suffix: string,
    loader: () => Promise<T>,
    options: CacheAsideOptions = {}
  ): Promise<CacheAsideResult<T>> => {
    const ttlSeconds = options.ttlSeconds ?? 60;
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

    const serialize = options.serialize ?? defaultSerialize;
    const deserialize = options.deserialize ?? defaultDeserialize;
    const fullKey = ns.toFullKey(suffix);
    const started = performance.now();

    const cached = await client.get(fullKey);
    if (cached !== null) {
      const ttl = await client.ttl(fullKey);
      return {
        hit: true,
        value: deserialize(cached) as T,
        latencyMs: Math.round(performance.now() - started),
        ttlSeconds: ttl >= 0 ? ttl : null,
      };
    }

    const value = await loader();
    const payload = serialize(value);
    if (Buffer.byteLength(payload, "utf8") > REDIS_BOUNDS.MAX_STRING_BYTES) {
      throw new RedisToolkitError(
        `Cached payload exceeds ${REDIS_BOUNDS.MAX_STRING_BYTES} bytes`,
        ErrorCode.VALIDATION_FAILED
      );
    }

    await client.set(fullKey, payload, "EX", ttlSeconds);
    const ttl = await client.ttl(fullKey);

    return {
      hit: false,
      value,
      latencyMs: Math.round(performance.now() - started),
      ttlSeconds: ttl >= 0 ? ttl : ttlSeconds,
    };
  };

  return { getOrLoad };
};

export type CacheAsideHelpers = ReturnType<typeof createCacheAsideHelpers>;
