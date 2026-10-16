import type { RequestHandler } from "express";
import { ErrorCode } from "@queuekit/shared";
import { ApiError } from "@queuekit/shared";

/**
 * Paths that must never exist as Redis/queue command forwarders.
 * Mounted explicitly so probes get a clear 404 with a stable error code.
 */
export const UNSAFE_REDIS_FORWARDER_PATHS = [
  "/api/v1/redis/command",
  "/api/v1/redis/commands",
  "/api/v1/redis/raw",
  "/api/v1/redis/eval",
  "/api/v1/redis/execute",
  "/api/v1/redis/cli",
  "/api/v1/redis/pipeline",
] as const;

/**
 * Reject arbitrary Redis command / generic forwarder probes.
 */
export const rejectUnsafeRedisForwarder: RequestHandler = (_req, _res, _next) => {
  throw new ApiError(
    404,
    "Arbitrary Redis commands are not exposed. Use allowlisted /api/v1/redis/demo/* operations only.",
    [],
    "",
    ErrorCode.NOT_FOUND
  );
};
