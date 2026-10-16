import {
  createRedisInfrastructure,
  type RedisInfrastructure,
} from "@queuekit/redis-toolkit";
import { DEMO_REDIS_NAMESPACE } from "@queuekit/shared";
import type { Redis } from "ioredis";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setRedisInfrastructure } from "@/cache/redis.js";
import {
  runCacheAsideDemo,
  runRateLimitDemo,
} from "@/services/redis-demo.service.js";

const createMockRedis = () => {
  const store = new Map<string, string>();
  const zsets = new Map<string, Map<string, number>>();

  const client = {
    status: "ready",
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
      return "OK";
    }),
    del: vi.fn(async (...keys: string[]) => {
      let n = 0;
      for (const key of keys) {
        if (store.delete(key)) n += 1;
        if (zsets.delete(key)) n += 1;
      }
      return n;
    }),
    ttl: vi.fn(async (key: string) => (store.has(key) ? 25 : -2)),
    multi: vi.fn(() => {
      const ops: Array<() => unknown> = [];
      const pipeline = {
        zremrangebyscore: (key: string, _min: number, max: number) => {
          ops.push(() => {
            const set = zsets.get(key) ?? new Map();
            for (const [member, score] of set) {
              if (score <= max) set.delete(member);
            }
            zsets.set(key, set);
            return 1;
          });
          return pipeline;
        },
        zadd: (key: string, score: number, member: string) => {
          ops.push(() => {
            const set = zsets.get(key) ?? new Map();
            set.set(member, score);
            zsets.set(key, set);
            return 1;
          });
          return pipeline;
        },
        zcard: (key: string) => {
          ops.push(() => zsets.get(key)?.size ?? 0);
          return pipeline;
        },
        pexpire: () => {
          ops.push(() => 1);
          return pipeline;
        },
        exec: async () => ops.map((op) => [null, op()]),
      };
      return pipeline;
    }),
    zrem: vi.fn(async (key: string, member: string) => {
      const set = zsets.get(key);
      if (!set?.has(member)) return 0;
      set.delete(member);
      return 1;
    }),
    on: vi.fn(),
  };

  return { client: client as unknown as Redis, store, zsets };
};

describe("cache-aside and rate-limit demos (mocked)", () => {
  let infra: RedisInfrastructure;

  beforeEach(() => {
    const { client } = createMockRedis();
    infra = createRedisInfrastructure({
      url: "redis://mock",
      keyPrefix: DEMO_REDIS_NAMESPACE,
      client,
    });
    setRedisInfrastructure(infra);
  });

  afterEach(() => {
    setRedisInfrastructure(null);
  });

  it("cache miss then hit", async () => {
    const miss = await runCacheAsideDemo({ forceMiss: true });
    expect(miss.hit).toBe(false);
    expect(miss.value.id).toBe("user:1");

    const hit = await runCacheAsideDemo();
    expect(hit.hit).toBe(true);
  });

  it("rate limit allows under quota then denies", async () => {
    for (let i = 0; i < 5; i += 1) {
      const allowed = await runRateLimitDemo({
        bucket: "unit",
        limit: 5,
        windowMs: 60_000,
      });
      expect(allowed.allowed).toBe(true);
    }

    await expect(
      runRateLimitDemo({ bucket: "unit", limit: 5, windowMs: 60_000 })
    ).rejects.toMatchObject({ statusCode: 429 });
  });
});
