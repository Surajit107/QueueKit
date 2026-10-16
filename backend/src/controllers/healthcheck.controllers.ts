import { createRequire } from "node:module";
import { ApiError, ApiResponse, ErrorCode } from "@queuekit/shared";
import { getRedisInfrastructure } from "@/cache/redis.js";
import { asyncHandler } from "@/utils/asyncHandler.js";

const require = createRequire(import.meta.url);
const packageJson = require("../../package.json") as {
  name: string;
  version: string;
};

/**
 * Liveness — process is up (product contract: GET /health).
 */
const healthcheck = asyncHandler(async (_req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, { status: "ok" }, "Health check passed"));
});

/**
 * Readiness — Redis reachable (required for QueueKit).
 */
const ready = asyncHandler(async (_req, res) => {
  const infra = getRedisInfrastructure();
  const health = infra
    ? await infra.health()
    : { status: "disconnected" as const };

  if (health.status !== "connected") {
    throw new ApiError(
      503,
      "Redis unhealthy",
      [],
      "",
      ErrorCode.DEPENDENCY_UNAVAILABLE
    );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { status: "ready", redis: "ready" },
        "Readiness check passed"
      )
    );
});

/**
 * Runtime / build metadata.
 */
const version = asyncHandler(async (_req, res) => {
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        name: packageJson.name,
        version: packageJson.version,
        node: process.version,
        env: process.env.NODE_ENV || "development",
      },
      "Version info fetched successfully"
    )
  );
});

export { healthcheck, ready, version };
