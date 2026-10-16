import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ErrorCode } from "@queuekit/shared";
import { setQueueInfrastructure } from "@/queues/index.js";
import { setRedisInfrastructure } from "@/cache/redis.js";
import { loadEnv, resetEnvCache } from "@/config/env.js";
import { errorHandler } from "@/middlewares/error.middlewares.js";
import { createJobSubmissionRateLimiter } from "@/middlewares/rateLimit.middlewares.js";
import { UNSAFE_REDIS_FORWARDER_PATHS } from "@/middlewares/rejectUnsafe.middlewares.js";
import { assertDemoNamespace } from "@/services/demo-reset.service.js";
import { createTestApp } from "../helpers/app.js";

describe("Phase 6 safety", () => {
  beforeEach(() => {
    setRedisInfrastructure(null);
    setQueueInfrastructure(null);
  });

  afterEach(() => {
    setRedisInfrastructure(null);
    setQueueInfrastructure(null);
    resetEnvCache();
    process.env.JOB_RATE_LIMIT_MAX = "20";
    process.env.JOB_RATE_LIMIT_WINDOW_MS = "60000";
  });

  it("rejects arbitrary Redis forwarder paths", async () => {
    const app = await createTestApp();

    for (const path of UNSAFE_REDIS_FORWARDER_PATHS) {
      const res = await request(app).post(path).send({ command: "FLUSHALL" });
      expect(res.status).toBe(404);
      expect(res.body.code).toBe(ErrorCode.NOT_FOUND);
      expect(res.body.message).toMatch(/not exposed/i);
    }
  });

  it("rejects unknown keys on demo key create (strict body)", async () => {
    const app = await createTestApp();
    const res = await request(app)
      .post("/api/v1/redis/demo/keys")
      .send({
        key: "ok",
        value: "v",
        command: "SET",
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(ErrorCode.VALIDATION_FAILED);
  });

  it("assertDemoNamespace allows demo prefixes and blocks unsafe ones", () => {
    expect(() => assertDemoNamespace("queuekit:demo:")).not.toThrow();
    expect(() => assertDemoNamespace("myapp:demo:lab:")).not.toThrow();
    expect(() => assertDemoNamespace(":")).toThrow(/demo namespace/i);
    expect(() => assertDemoNamespace("prod:")).toThrow(/demo namespace/i);
  });

  it("job submission rate limiter blocks after threshold", async () => {
    resetEnvCache();
    process.env.JOB_RATE_LIMIT_WINDOW_MS = "60000";
    process.env.JOB_RATE_LIMIT_MAX = "2";
    loadEnv();

    const app = express();
    app.use(express.json());
    app.post(
      "/jobs",
      createJobSubmissionRateLimiter(),
      (_req, res) => {
        res.status(200).json({ ok: true });
      }
    );
    app.use(errorHandler);

    expect((await request(app).post("/jobs").send({})).status).toBe(200);
    expect((await request(app).post("/jobs").send({})).status).toBe(200);

    const limited = await request(app).post("/jobs").send({});
    expect(limited.status).toBe(429);
    expect(limited.body.code).toBe(ErrorCode.RATE_LIMITED);
  });
});
