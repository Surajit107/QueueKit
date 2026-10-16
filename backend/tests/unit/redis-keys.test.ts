import {
  createRedisInfrastructure,
  type RedisInfrastructure,
} from "@queuekit/redis-toolkit";
import { DEMO_REDIS_NAMESPACE } from "@queuekit/shared";
import type { Redis } from "ioredis";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setRedisInfrastructure } from "@/cache/redis.js";
import {
  deleteDemoKey,
  getDemoKey,
  listDemoKeys,
  setDemoKey,
} from "@/services/redis-demo.service.js";

const createMockRedis = () => {
  const store = new Map<string, { value: string; expiresAt: number | null }>();

  const client = {
    status: "ready",
    get: vi.fn(async (key: string) => store.get(key)?.value ?? null),
    set: vi.fn(async (key: string, value: string, mode?: string, ttl?: number) => {
      const expiresAt =
        mode === "EX" && typeof ttl === "number"
          ? Date.now() + ttl * 1000
          : null;
      store.set(key, { value, expiresAt });
      return "OK";
    }),
    del: vi.fn(async (...keys: string[]) => {
      let count = 0;
      for (const key of keys) {
        if (store.delete(key)) count += 1;
      }
      return count;
    }),
    ttl: vi.fn(async (key: string) => {
      const entry = store.get(key);
      if (!entry) return -2;
      if (entry.expiresAt === null) return -1;
      return Math.max(0, Math.ceil((entry.expiresAt - Date.now()) / 1000));
    }),
    scan: vi.fn(async () => {
      const keys = [...store.keys()];
      return ["0", keys] as [string, string[]];
    }),
    ping: vi.fn(async () => "PONG"),
    quit: vi.fn(async () => "OK"),
    disconnect: vi.fn(),
    on: vi.fn(),
    connect: vi.fn(async () => undefined),
  };

  return { client: client as unknown as Redis, store };
};

describe("redis demo key service (mocked)", () => {
  let infra: RedisInfrastructure;

  beforeEach(async () => {
    const { client } = createMockRedis();
    infra = createRedisInfrastructure({
      url: "redis://mock",
      keyPrefix: DEMO_REDIS_NAMESPACE,
      client,
    });
    setRedisInfrastructure(infra);
  });

  afterEach(async () => {
    setRedisInfrastructure(null);
  });

  it("sets and gets a namespaced key with TTL", async () => {
    const created = await setDemoKey({
      key: "greeting",
      value: "hello",
      ttlSeconds: 30,
    });
    expect(created.key).toBe("greeting");
    expect(created.value).toBe("hello");
    expect(created.ttlSeconds).toBeGreaterThan(0);

    const fetched = await getDemoKey("greeting");
    expect(fetched.value).toBe("hello");
  });

  it("lists only namespaced suffixes", async () => {
    await setDemoKey({ key: "a", value: "1" });
    await setDemoKey({ key: "b", value: "2" });
    const keys = await listDemoKeys();
    expect(keys.sort()).toEqual(["a", "b"]);
  });

  it("deletes a key", async () => {
    await setDemoKey({ key: "temp", value: "x" });
    const result = await deleteDemoKey("temp");
    expect(result.deleted).toBe(true);
  });
});
