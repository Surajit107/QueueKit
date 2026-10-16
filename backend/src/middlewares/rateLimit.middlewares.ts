import type { Request, RequestHandler } from "express";
import { rateLimit } from "express-rate-limit";
import requestIp from "request-ip";
import { ErrorCode } from "@queuekit/shared";
import { getEnv } from "@/config/env.js";
import { ApiError } from "@queuekit/shared";

const clientKey = (req: Request): string =>
  requestIp.getClientIp(req) || req.ip || "unknown";

const createLimiter = (options: {
  windowMs: number;
  max: number;
  message: string;
  skip?: (req: { path: string; originalUrl: string }) => boolean;
}): RequestHandler =>
  rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => clientKey(req),
    skip: options.skip
      ? (req) => options.skip!({ path: req.path, originalUrl: req.originalUrl })
      : undefined,
    handler: (_req, _res, _next, rateLimitOptions) => {
      throw new ApiError(
        rateLimitOptions.statusCode || 429,
        options.message,
        [
          {
            limit: rateLimitOptions.max,
            windowMs: rateLimitOptions.windowMs,
          },
        ],
        "",
        ErrorCode.RATE_LIMITED
      );
    },
  });

const isOpsPath = (path: string, originalUrl: string): boolean => {
  const candidate = path || originalUrl;
  return (
    candidate === "/health" ||
    candidate === "/ready" ||
    candidate === "/version" ||
    candidate.startsWith("/health") ||
    candidate.startsWith("/ready") ||
    candidate.startsWith("/version")
  );
};

/**
 * Global per-IP limiter for public API traffic.
 * Ops/liveness probes are excluded so platforms do not trip demo quotas.
 */
export const createGlobalRateLimiter = (): RequestHandler => {
  const env = getEnv();
  return createLimiter({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    message: `Too many requests. Allowed ${env.RATE_LIMIT_MAX} per ${env.RATE_LIMIT_WINDOW_MS / 60_000} minutes`,
    skip: ({ path, originalUrl }) => isOpsPath(path, originalUrl),
  });
};

/**
 * Conservative job enqueue limiter — separate from the global budget.
 */
export const createJobSubmissionRateLimiter = (): RequestHandler => {
  const env = getEnv();
  return createLimiter({
    windowMs: env.JOB_RATE_LIMIT_WINDOW_MS,
    max: env.JOB_RATE_LIMIT_MAX,
    message: `Job submission rate limit exceeded. Allowed ${env.JOB_RATE_LIMIT_MAX} enqueues per ${env.JOB_RATE_LIMIT_WINDOW_MS / 1000} seconds`,
  });
};

/**
 * Tight limiter for destructive demo reset.
 */
export const createDemoResetRateLimiter = (): RequestHandler => {
  const env = getEnv();
  return createLimiter({
    windowMs: env.RESET_RATE_LIMIT_WINDOW_MS,
    max: env.RESET_RATE_LIMIT_MAX,
    message: `Demo reset rate limit exceeded. Allowed ${env.RESET_RATE_LIMIT_MAX} resets per ${env.RESET_RATE_LIMIT_WINDOW_MS / 60_000} minutes`,
  });
};

/**
 * Aggressive limiter for Redis Pub/Sub publish (demo teaching surface).
 */
export const createPubSubPublishRateLimiter = (): RequestHandler => {
  const env = getEnv();
  return createLimiter({
    windowMs: env.PUBSUB_RATE_LIMIT_WINDOW_MS,
    max: env.PUBSUB_RATE_LIMIT_MAX,
    message: `Pub/Sub publish rate limit exceeded. Allowed ${env.PUBSUB_RATE_LIMIT_MAX} publishes per ${env.PUBSUB_RATE_LIMIT_WINDOW_MS / 1000} seconds`,
  });
};
