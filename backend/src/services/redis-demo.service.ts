import type {
  CacheAsideResult,
  DemoKeyRecord,
  RateLimitResult,
} from "@queuekit/redis-toolkit";
import { ApiError, DemoEventEnum, ErrorCode } from "@queuekit/shared";
import { demoEvents } from "@/services/demo-events.service.js";
import {
  mapToolkitError,
  requireRedisInfrastructure,
} from "@/utils/toolkitErrors.js";

const CACHE_DEMO_KEY = "cache:demo:user:1";
const RATE_LIMIT_DEMO_PREFIX = "ratelimit:demo";
const COUNTER_DEMO_KEY = "counter:demo";

/** Controlled mock source — no external I/O. */
const mockUserSource = async (): Promise<{
  id: string;
  name: string;
  fetchedAt: string;
}> => {
  await new Promise((resolve) => setTimeout(resolve, 25));
  return {
    id: "user:1",
    name: "Demo User",
    fetchedAt: new Date().toISOString(),
  };
};

export const listDemoKeys = async (): Promise<string[]> => {
  const redis = requireRedisInfrastructure();
  try {
    return await redis.keys.listKeys();
  } catch (error) {
    return mapToolkitError(error);
  }
};

export const getDemoKey = async (key: string): Promise<DemoKeyRecord> => {
  const redis = requireRedisInfrastructure();
  try {
    return await redis.keys.getString(key);
  } catch (error) {
    return mapToolkitError(error);
  }
};

export const setDemoKey = async (input: {
  key: string;
  value: string;
  ttlSeconds?: number;
}): Promise<DemoKeyRecord> => {
  const redis = requireRedisInfrastructure();
  try {
    const record = await redis.keys.setString(
      input.key,
      input.value,
      input.ttlSeconds
    );
    demoEvents.publish(DemoEventEnum.REDIS_KEY_CHANGED, {
      op: "set",
      key: record.key,
      ttlSeconds: record.ttlSeconds,
    });
    return record;
  } catch (error) {
    return mapToolkitError(error);
  }
};

export const deleteDemoKey = async (
  key: string
): Promise<{ key: string; deleted: boolean }> => {
  const redis = requireRedisInfrastructure();
  try {
    const result = await redis.keys.deleteKey(key);
    demoEvents.publish(DemoEventEnum.REDIS_KEY_CHANGED, {
      op: "delete",
      key: result.key,
      deleted: result.deleted,
    });
    return result;
  } catch (error) {
    return mapToolkitError(error);
  }
};

export const runCacheAsideDemo = async (options?: {
  forceMiss?: boolean;
}): Promise<
  CacheAsideResult<{ id: string; name: string; fetchedAt: string }> & {
    metricsLabel: string;
  }
> => {
  const redis = requireRedisInfrastructure();
  try {
    if (options?.forceMiss) {
      await redis.keys.deleteKey(CACHE_DEMO_KEY);
    }

    const result = await redis.cache.getOrLoad(
      CACHE_DEMO_KEY,
      mockUserSource,
      { ttlSeconds: 30 }
    );

    return {
      ...result,
      metricsLabel: "demo metrics — not production SLOs",
    };
  } catch (error) {
    return mapToolkitError(error);
  }
};

export const runRateLimitDemo = async (input?: {
  bucket?: string;
  limit?: number;
  windowMs?: number;
}): Promise<RateLimitResult & { bucket: string }> => {
  const redis = requireRedisInfrastructure();
  const bucket = (input?.bucket || "default")
    .replace(/[^a-zA-Z0-9:_-]/g, "")
    .slice(0, 32) || "default";
  const suffix = `${RATE_LIMIT_DEMO_PREFIX}:${bucket}`;

  try {
    const result = await redis.rateLimit.consume(suffix, {
      limit: input?.limit ?? 5,
      windowMs: input?.windowMs ?? 60_000,
    });

    if (!result.allowed) {
      throw new ApiError(
        429,
        "Demo rate limit exceeded",
        [result],
        "",
        ErrorCode.RATE_LIMITED
      );
    }

    return { ...result, bucket };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    return mapToolkitError(error);
  }
};

export const runCounterDemo = async (input?: {
  op?: "incr" | "decr" | "get";
  by?: number;
}): Promise<{ key: string; value: number; op: string }> => {
  const redis = requireRedisInfrastructure();
  const op = input?.op ?? "incr";
  const by = input?.by ?? 1;

  try {
    if (op === "get") {
      const result = await redis.counters.get(COUNTER_DEMO_KEY);
      return { ...result, op };
    }
    if (op === "decr") {
      const result = await redis.counters.decr(COUNTER_DEMO_KEY, by);
      return { ...result, op };
    }
    const result = await redis.counters.incr(COUNTER_DEMO_KEY, by);
    return { ...result, op };
  } catch (error) {
    return mapToolkitError(error);
  }
};

export const runStructureDemo = async (input: {
  kind: "hash" | "list" | "set" | "zset";
  key: string;
  field?: string;
  value?: string;
  member?: string;
  score?: number;
}): Promise<unknown> => {
  const redis = requireRedisInfrastructure();
  try {
    switch (input.kind) {
      case "hash": {
        if (!input.field || input.value === undefined) {
          throw new ApiError(400, "hash requires field and value");
        }
        await redis.structures.hashSet(input.key, input.field, input.value);
        return await redis.structures.hashGetAll(input.key);
      }
      case "list": {
        if (input.value === undefined) {
          throw new ApiError(400, "list requires value");
        }
        await redis.structures.listPush(input.key, input.value);
        return await redis.structures.listRange(input.key);
      }
      case "set": {
        if (!input.member) {
          throw new ApiError(400, "set requires member");
        }
        await redis.structures.setAdd(input.key, input.member);
        return await redis.structures.setMembers(input.key);
      }
      case "zset": {
        if (!input.member || input.score === undefined) {
          throw new ApiError(400, "zset requires member and score");
        }
        await redis.structures.zAdd(input.key, input.score, input.member);
        return await redis.structures.zRangeWithScores(input.key);
      }
      default: {
        const _exhaustive: never = input.kind;
        throw new ApiError(400, `Unsupported structure: ${_exhaustive}`);
      }
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    return mapToolkitError(error);
  }
};
