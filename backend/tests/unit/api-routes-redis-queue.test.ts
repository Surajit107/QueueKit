import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createRedisInfrastructure,
  type RedisInfrastructure,
} from "@queuekit/redis-toolkit";
import {
  DEMO_REDIS_NAMESPACE,
  DemoJobTypeEnum,
  DemoQueueNameEnum,
  ErrorCode,
} from "@queuekit/shared";
import { setRedisInfrastructure } from "@/cache/redis.js";
import { setQueueInfrastructure } from "@/queues/index.js";
import { createTestApp } from "../helpers/app.js";
import { createMockRedisClient } from "../helpers/mock-redis.js";

describe("H. Route handlers — Redis + Queues", () => {
  let infra: RedisInfrastructure;

  beforeEach(() => {
    const mock = createMockRedisClient();
    infra = createRedisInfrastructure({
      url: "redis://mock",
      keyPrefix: DEMO_REDIS_NAMESPACE,
      client: mock.client,
    });
    setRedisInfrastructure(infra);
    setQueueInfrastructure(null);
  });

  afterEach(() => {
    setRedisInfrastructure(null);
    setQueueInfrastructure(null);
  });

  it("GET /api/v1/redis/demo/keys", async () => {
    await infra.keys.setString("listed", "1");
    const app = await createTestApp();
    const res = await request(app).get("/api/v1/redis/demo/keys");

    expect(res.status).toBe(200);
    expect(res.body.data.keys).toContain("listed");
  });

  it("POST /api/v1/redis/demo/keys valid + invalid body", async () => {
    const app = await createTestApp();

    const valid = await request(app)
      .post("/api/v1/redis/demo/keys")
      .send({ key: "hello", value: "world", ttlSeconds: 30 });
    expect(valid.status).toBe(201);
    expect(valid.body.data.value).toBe("world");

    const invalid = await request(app)
      .post("/api/v1/redis/demo/keys")
      .send({ key: "bad key!", value: "x" });
    expect(invalid.status).toBe(400);
  });

  it("GET /api/v1/redis/demo/keys/:key found + not found", async () => {
    await infra.keys.setString("exists", "yes");
    const app = await createTestApp();

    const found = await request(app).get("/api/v1/redis/demo/keys/exists");
    expect(found.status).toBe(200);
    expect(found.body.data.value).toBe("yes");

    const missing = await request(app).get("/api/v1/redis/demo/keys/missing");
    expect(missing.status).toBe(404);
    expect(missing.body.code).toBe(ErrorCode.NOT_FOUND);
  });

  it("DELETE /api/v1/redis/demo/keys/:key", async () => {
    await infra.keys.setString("temp", "x");
    const app = await createTestApp();
    const res = await request(app).delete("/api/v1/redis/demo/keys/temp");

    expect(res.status).toBe(200);
    expect(res.body.data.deleted).toBe(true);
  });

  it("POST /api/v1/redis/demo/cache", async () => {
    const app = await createTestApp();
    const miss = await request(app)
      .post("/api/v1/redis/demo/cache")
      .send({ forceMiss: true });
    expect(miss.status).toBe(200);
    expect(miss.body.data.hit).toBe(false);

    const hit = await request(app).post("/api/v1/redis/demo/cache").send({});
    expect(hit.status).toBe(200);
    expect(hit.body.data.hit).toBe(true);
  });

  it("POST /api/v1/redis/demo/rate-limit", async () => {
    const app = await createTestApp();
    const allowed = await request(app)
      .post("/api/v1/redis/demo/rate-limit")
      .send({ bucket: "routes", limit: 2, windowMs: 60_000 });
    expect(allowed.status).toBe(200);
    expect(allowed.body.data.allowed).toBe(true);

    await request(app)
      .post("/api/v1/redis/demo/rate-limit")
      .send({ bucket: "routes", limit: 2, windowMs: 60_000 });

    const denied = await request(app)
      .post("/api/v1/redis/demo/rate-limit")
      .send({ bucket: "routes", limit: 2, windowMs: 60_000 });
    expect(denied.status).toBe(429);
    expect(denied.body.code).toBe(ErrorCode.RATE_LIMITED);
  });

  it("GET queue jobs / job detail / metrics", async () => {
    const job = {
      id: "job-9",
      name: DemoJobTypeEnum.ECHO,
      queueName: DemoQueueNameEnum.DEMO,
      state: "waiting" as const,
      data: { message: "hi" },
      result: null,
      failedReason: null,
      attemptsMade: 0,
      attemptsMax: 1,
      timestamp: Date.now(),
      processedOn: null,
      finishedOn: null,
      delay: null,
      priority: null,
    };

    setQueueInfrastructure({
      enqueue: vi.fn(),
      listJobs: vi.fn(async () => [job]),
      getJob: vi.fn(async () => job),
      getMetrics: vi.fn(async () => ({
        queueName: DemoQueueNameEnum.DEMO,
        waiting: 1,
        active: 0,
        delayed: 0,
        completed: 2,
        failed: 0,
        paused: 0,
      })),
      resetQueue: vi.fn(),
      getOrCreateQueue: vi.fn(),
      createWorker: vi.fn(),
      createConnection: vi.fn(),
      close: vi.fn(),
    } as never);

    const app = await createTestApp();
    const base = `/api/v1/queues/${DemoQueueNameEnum.DEMO}`;

    const list = await request(app).get(`${base}/jobs`);
    expect(list.status).toBe(200);
    expect(list.body.data.jobs[0].id).toBe("job-9");

    const detail = await request(app).get(`${base}/jobs/job-9`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.job.id).toBe("job-9");

    const metrics = await request(app).get(`${base}/metrics`);
    expect(metrics.status).toBe(200);
    expect(metrics.body.data.metrics.completed).toBe(2);
  });

  it("POST /api/v1/demo/reset with confirmation (mocked)", async () => {
    const app = await createTestApp();
    await infra.keys.setString("wipe-me", "1");

    const res = await request(app)
      .post("/api/v1/demo/reset")
      .send({ confirm: true });

    expect(res.status).toBe(200);
    expect(res.body.data.deletedKeys).toBeGreaterThanOrEqual(1);
    expect(res.body.data.prefix).toBe(DEMO_REDIS_NAMESPACE);
  });

  it("POST /api/v1/redis/demo/counter", async () => {
    const app = await createTestApp();
    const res = await request(app)
      .post("/api/v1/redis/demo/counter")
      .send({ op: "incr", by: 2 });

    expect(res.status).toBe(200);
    expect(res.body.data.value).toBe(2);
    expect(res.body.data.op).toBe("incr");
  });

  it("POST /api/v1/redis/demo/structures", async () => {
    const app = await createTestApp();
    const res = await request(app)
      .post("/api/v1/redis/demo/structures")
      .send({ kind: "hash", key: "hdemo", field: "f", value: "v" });

    expect(res.status).toBe(200);
    expect(res.body.data.result.fields.f).toBe("v");
  });
});
