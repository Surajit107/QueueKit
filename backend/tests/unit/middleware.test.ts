import request from "supertest";
import { describe, expect, it } from "vitest";
import { createTestApp } from "../helpers/app.js";

describe("C. Middleware", () => {
  it("CORS allows configured frontend origin", async () => {
    const app = await createTestApp();
    const res = await request(app)
      .get("/api/v1/status")
      .set("Origin", "http://localhost:3000");

    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe(
      "http://localhost:3000"
    );
  });

  it("CORS rejects disallowed origins", async () => {
    const app = await createTestApp();
    const res = await request(app)
      .get("/api/v1/status")
      .set("Origin", "https://evil.example");

    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("Body size over limit is rejected", async () => {
    const app = await createTestApp();
    const oversized = "x".repeat(20_000);

    const res = await request(app)
      .post("/api/v1/redis/demo/keys")
      .send({ key: "big", value: oversized });

    // express.json limit (16kb) → 413, or Zod max(1024) → 400 if under limit path.
    expect([400, 413]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });
});
