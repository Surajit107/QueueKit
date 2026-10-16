import {
  createRedisInfrastructure,
  REDIS_BOUNDS,
  type RedisInfrastructure,
} from "@queuekit/redis-toolkit";
import { DEMO_REDIS_NAMESPACE } from "@queuekit/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setRedisInfrastructure } from "@/cache/redis.js";
import {
  deleteDemoKey,
  getDemoKey,
  listDemoKeys,
  runCacheAsideDemo,
  runCounterDemo,
  runStructureDemo,
  setDemoKey,
} from "@/services/redis-demo.service.js";
import { resetDemoResources } from "@/services/demo-reset.service.js";
import { createMockRedisClient } from "../helpers/mock-redis.js";

describe("E. Redis services (mocked)", () => {
  let infra: RedisInfrastructure;
  let strings: Map<string, { value: string; expiresAt: number | null }>;

  beforeEach(() => {
    const mock = createMockRedisClient();
    strings = mock.strings;
    infra = createRedisInfrastructure({
      url: "redis://mock",
      keyPrefix: DEMO_REDIS_NAMESPACE,
      client: mock.client,
    });
    setRedisInfrastructure(infra);
  });

  afterEach(() => {
    setRedisInfrastructure(null);
  });

  it("sets / gets / deletes a demo key", async () => {
    await setDemoKey({ key: "k1", value: "v1", ttlSeconds: 60 });
    expect((await getDemoKey("k1")).value).toBe("v1");
    expect((await deleteDemoKey("k1")).deleted).toBe(true);
  });

  it("list returns only allowlisted namespaced keys", async () => {
    await setDemoKey({ key: "a", value: "1" });
    // Outside namespace — not visible via demo helpers / scan prefix.
    strings.set("other:secret", { value: "nope", expiresAt: null });
    const keys = await listDemoKeys();
    expect(keys).toEqual(["a"]);
    expect(keys.every((k) => !k.startsWith("other:"))).toBe(true);
  });

  it("TTL set + remaining TTL read", async () => {
    const created = await setDemoKey({
      key: "ttl-key",
      value: "x",
      ttlSeconds: 45,
    });
    expect(created.ttlSeconds).toBeGreaterThan(0);
    expect(created.ttlSeconds).toBeLessThanOrEqual(45);
    const fetched = await getDemoKey("ttl-key");
    expect(fetched.ttlSeconds).toBeGreaterThan(0);
  });

  it("string / hash / list / set / zset demo ops stay within bounds", async () => {
    await expect(
      setDemoKey({ key: "s", value: "x".repeat(REDIS_BOUNDS.MAX_STRING_BYTES + 1) })
    ).rejects.toMatchObject({ statusCode: 400 });

    const hash = (await runStructureDemo({
      kind: "hash",
      key: "h1",
      field: "f",
      value: "v",
    })) as { fields: Record<string, string> };
    expect(hash.fields.f).toBe("v");

    const list = (await runStructureDemo({
      kind: "list",
      key: "l1",
      value: "item",
    })) as { items: string[] };
    expect(list.items).toContain("item");

    const set = (await runStructureDemo({
      kind: "set",
      key: "s1",
      member: "m1",
    })) as { members: string[] };
    expect(set.members).toContain("m1");

    const zset = (await runStructureDemo({
      kind: "zset",
      key: "z1",
      member: "zm",
      score: 10,
    })) as { members: Array<{ member: string; score: number }> };
    expect(zset.members[0]).toMatchObject({ member: "zm", score: 10 });
  });

  it("cache-aside miss fetches mock source; hit skips loader path", async () => {
    const miss = await runCacheAsideDemo({ forceMiss: true });
    expect(miss.hit).toBe(false);
    expect(miss.latencyMs).toBeGreaterThanOrEqual(0);
    expect(miss.metricsLabel).toMatch(/demo metrics/i);

    const hit = await runCacheAsideDemo();
    expect(hit.hit).toBe(true);
    expect(hit.value.id).toBe("user:1");
  });

  it("cache metrics fields are present on hit and miss", async () => {
    const miss = await runCacheAsideDemo({ forceMiss: true });
    const hit = await runCacheAsideDemo();
    expect(miss).toMatchObject({
      hit: false,
      latencyMs: expect.any(Number),
      ttlSeconds: expect.anything(),
    });
    expect(hit).toMatchObject({
      hit: true,
      latencyMs: expect.any(Number),
    });
  });

  it("counter INCR / DECR behavior", async () => {
    const incr = await runCounterDemo({ op: "incr", by: 2 });
    expect(incr.value).toBe(2);
    const decr = await runCounterDemo({ op: "decr", by: 1 });
    expect(decr.value).toBe(1);
    const get = await runCounterDemo({ op: "get" });
    expect(get.value).toBe(1);
  });

  it("reset deletes only namespaced demo keys", async () => {
    await setDemoKey({ key: "demo-only", value: "1" });
    strings.set("prod:keep", { value: "alive", expiresAt: null });

    const result = await resetDemoResources(true);
    expect(result.deletedKeys).toBeGreaterThanOrEqual(1);
    expect(result.prefix).toBe(DEMO_REDIS_NAMESPACE);
    expect(strings.has("prod:keep")).toBe(true);
    expect(strings.has(`${DEMO_REDIS_NAMESPACE}demo-only`)).toBe(false);
  });
});
