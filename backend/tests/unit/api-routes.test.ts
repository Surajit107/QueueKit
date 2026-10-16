import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DemoJobTypeEnum,
  DemoQueueNameEnum,
  ErrorCode,
} from "@queuekit/shared";
import { setQueueInfrastructure } from "@/queues/index.js";
import { setRedisInfrastructure } from "@/cache/redis.js";
import { createTestApp } from "../helpers/app.js";

describe("Phase 5 HTTP routes", () => {
  beforeEach(() => {
    setRedisInfrastructure(null);
    setQueueInfrastructure(null);
  });

  afterEach(() => {
    setRedisInfrastructure(null);
    setQueueInfrastructure(null);
  });

  it("GET /api/v1/status returns honest envelope with notes", async () => {
    const app = await createTestApp();
    const res = await request(app).get("/api/v1/status");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      api: "ok",
      redis: "disconnected",
      worker: expect.stringMatching(/^(active|unknown|offline)$/),
      workerHeartbeatAt: null,
    });
    expect(Array.isArray(res.body.data.notes)).toBe(true);
    expect(res.body.data.notes.length).toBeGreaterThan(0);
  });

  it("POST /api/v1/demo/reset requires confirm: true", async () => {
    const app = await createTestApp();
    const res = await request(app)
      .post("/api/v1/demo/reset")
      .send({ confirm: false });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("POST /api/v1/demo/reset without confirm fails validation", async () => {
    const app = await createTestApp();
    const res = await request(app).post("/api/v1/demo/reset").send({});

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(ErrorCode.VALIDATION_FAILED);
  });

  it("rejects unknown queue names at validation", async () => {
    const app = await createTestApp();
    const res = await request(app)
      .post("/api/v1/queues/evil-queue/jobs")
      .send({ type: DemoJobTypeEnum.ECHO, payload: {} });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rejects unknown job types at validation", async () => {
    const app = await createTestApp();
    const res = await request(app)
      .post(`/api/v1/queues/${DemoQueueNameEnum.DEMO}/jobs`)
      .send({ type: "send-email", payload: {} });

    expect(res.status).toBe(400);
  });

  it("enqueue returns 503 when queue infra is down", async () => {
    const app = await createTestApp();
    const res = await request(app)
      .post(`/api/v1/queues/${DemoQueueNameEnum.DEMO}/jobs`)
      .send({ type: DemoJobTypeEnum.ECHO, payload: { message: "x" } });

    expect(res.status).toBe(503);
    expect(res.body.code).toBe(ErrorCode.DEPENDENCY_UNAVAILABLE);
  });

  it("enqueue succeeds with mocked queue infrastructure", async () => {
    const enqueue = vi.fn(async () => ({
      id: "job-1",
      name: DemoJobTypeEnum.ECHO,
      queueName: DemoQueueNameEnum.DEMO,
      state: "waiting" as const,
      data: { message: "x" },
      result: null,
      failedReason: null,
      attemptsMade: 0,
      attemptsMax: 1,
      timestamp: Date.now(),
      processedOn: null,
      finishedOn: null,
      delay: null,
      priority: null,
    }));

    setQueueInfrastructure({
      enqueue,
      listJobs: vi.fn(),
      getJob: vi.fn(),
      getMetrics: vi.fn(),
      resetQueue: vi.fn(),
      getOrCreateQueue: vi.fn(),
      createWorker: vi.fn(),
      createConnection: vi.fn(),
      close: vi.fn(),
    } as never);

    const app = await createTestApp();
    const res = await request(app)
      .post(`/api/v1/queues/${DemoQueueNameEnum.DEMO}/jobs`)
      .send({ type: DemoJobTypeEnum.ECHO, payload: { message: "x" } });

    expect(res.status).toBe(201);
    expect(res.body.data.job.id).toBe("job-1");
    expect(enqueue).toHaveBeenCalled();
  });

  it("GET /api/v1/events rejects unknown types", async () => {
    const app = await createTestApp();
    const res = await request(app).get("/api/v1/events?types=evil.event");

    expect(res.status).toBe(400);
  });

  it("GET /api/v1/events streams connected event then cleans up", async () => {
    const app = await createTestApp();
    const server = createServer(app);

    await new Promise<void>((resolve, reject) => {
      server.listen(0, () => resolve());
      server.on("error", reject);
    });

    const { port } = server.address() as AddressInfo;

    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/v1/events`);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toMatch(/text\/event-stream/);

      const reader = response.body?.getReader();
      expect(reader).toBeDefined();
      const { value } = await reader!.read();
      const text = new TextDecoder().decode(value);
      expect(text).toContain("event: connected");
      expect(text).toContain("pollingFallback");
      await reader!.cancel();
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });

  it("redis demo key create validates body", async () => {
    const app = await createTestApp();
    const res = await request(app)
      .post("/api/v1/redis/demo/keys")
      .send({ key: "bad key!", value: "x" });

    expect(res.status).toBe(400);
  });
});
