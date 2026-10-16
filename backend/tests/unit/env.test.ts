import { afterEach, describe, expect, it } from "vitest";
import { loadEnv, resetEnvCache } from "@/config/env.js";
import { createTestApp } from "../helpers/app.js";

describe("A. Config & bootstrap", () => {
  afterEach(() => {
    resetEnvCache();
  });

  it("env schema accepts valid config", () => {
    const env = loadEnv({
      NODE_ENV: "development",
      PORT: "8000",
      QUEUEKIT_API_HOST_URL: "http://localhost:8000",
      CORS_ORIGIN: "http://localhost:3000",
      REDIS_URL: "redis://127.0.0.1:6379",
      REDIS_KEY_PREFIX: "queuekit:demo:",
      BODY_SIZE_LIMIT: "16kb",
      RATE_LIMIT_WINDOW_MS: "900000",
      RATE_LIMIT_MAX: "500",
      JOB_RATE_LIMIT_WINDOW_MS: "60000",
      JOB_RATE_LIMIT_MAX: "20",
      RESET_RATE_LIMIT_WINDOW_MS: "900000",
      RESET_RATE_LIMIT_MAX: "5",
      RUN_WORKER: "true",
    });

    expect(env.PORT).toBe(8000);
    expect(env.RUN_WORKER).toBe(true);
    expect(env.REDIS_KEY_PREFIX).toBe("queuekit:demo:");
    expect(env.JOB_RATE_LIMIT_MAX).toBe(20);
    expect(env.RESET_RATE_LIMIT_MAX).toBe(5);
  });

  it("env schema rejects missing / invalid required variables", () => {
    expect(() =>
      loadEnv({
        NODE_ENV: "development",
        CORS_ORIGIN: "http://localhost:3000",
        REDIS_URL: "",
      })
    ).toThrow(/REDIS_URL/);

    expect(() =>
      loadEnv({
        NODE_ENV: "development",
        REDIS_URL: "redis://127.0.0.1:6379",
        REDIS_KEY_PREFIX: "queuekit:demo",
      })
    ).toThrow(/REDIS_KEY_PREFIX/);
  });

  it("app boots with validated config", async () => {
    const app = await createTestApp();
    expect(app).toBeDefined();
    expect(typeof app.use).toBe("function");
  });

  it("app refuses to start when Redis URL is missing", () => {
    resetEnvCache();
    expect(() =>
      loadEnv({
        NODE_ENV: "test",
        CORS_ORIGIN: "http://localhost:3000",
        // REDIS_URL omitted
      } as NodeJS.ProcessEnv)
    ).toThrow(/REDIS_URL|Invalid environment/);
  });
});
