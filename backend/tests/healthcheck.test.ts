import request from "supertest";
import { createTestApp } from "./helpers/app.js";

describe("health endpoints", () => {
  it("GET /health returns ok", async () => {
    const app = await createTestApp();
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({ status: "ok" });
  });

  it("GET /version returns package metadata", async () => {
    const app = await createTestApp();
    const res = await request(app).get("/version");

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("@queuekit/api");
    expect(res.body.data.version).toBeDefined();
  });

  it("GET /healthcheck and /live are not exposed", async () => {
    const app = await createTestApp();
    expect((await request(app).get("/healthcheck")).status).toBe(404);
    expect((await request(app).get("/live")).status).toBe(404);
  });
});
