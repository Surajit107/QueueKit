import type { Redis } from "ioredis";
import type { RedisHealthResult } from "./types.js";

/**
 * Honest Redis health probe — never fabricates connected on failure.
 */
export const probeRedisHealth = async (
  client: Redis | null
): Promise<RedisHealthResult> => {
  if (!client || client.status !== "ready") {
    return { status: "disconnected", latencyMs: null };
  }

  const started = performance.now();
  try {
    const pong = await client.ping();
    const latencyMs = Math.round(performance.now() - started);
    if (pong !== "PONG") {
      return { status: "disconnected", latencyMs };
    }
    return { status: "connected", latencyMs };
  } catch {
    return { status: "disconnected", latencyMs: null };
  }
};
