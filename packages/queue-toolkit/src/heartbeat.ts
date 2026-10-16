import type { Redis } from "ioredis";
import type { WorkerStatus } from "@queuekit/shared";
import { QUEUE_BOUNDS } from "./defaults.js";
import type {
  HeartbeatReporterOptions,
  QueueLogger,
  WorkerHealthSnapshot,
} from "./types.js";

export type HeartbeatReporter = {
  start: () => void;
  stop: () => Promise<void>;
  beat: () => Promise<void>;
};

/**
 * Periodic Redis heartbeat writer for worker health reporting.
 * Caller owns the key namespace (e.g. `queuekit:demo:worker:heartbeat`).
 */
export const createHeartbeatReporter = (
  options: HeartbeatReporterOptions
): HeartbeatReporter => {
  const intervalMs =
    options.intervalMs ?? QUEUE_BOUNDS.HEARTBEAT_INTERVAL_MS;
  const ttlSeconds =
    options.ttlSeconds ?? QUEUE_BOUNDS.HEARTBEAT_TTL_SECONDS;
  const logger = options.logger;
  let timer: ReturnType<typeof setInterval> | null = null;
  let stopped = false;

  const beat = async (): Promise<void> => {
    if (stopped) return;
    const payload = JSON.stringify({
      at: new Date().toISOString(),
      pid: process.pid,
    });
    await options.redis.set(options.key, payload, "EX", ttlSeconds);
  };

  const start = (): void => {
    if (timer) return;
    stopped = false;
    void beat().catch((error) => {
      logger?.error?.("Worker heartbeat failed", error);
    });
    timer = setInterval(() => {
      void beat().catch((error) => {
        logger?.error?.("Worker heartbeat failed", error);
      });
    }, intervalMs);
    timer.unref?.();
  };

  const stop = async (): Promise<void> => {
    stopped = true;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    try {
      await options.redis.del(options.key);
    } catch (error) {
      logger?.error?.("Failed to clear worker heartbeat", error);
    }
  };

  return { start, stop, beat };
};

/**
 * Read worker health from a heartbeat key.
 * Missing / stale → offline; unreadable Redis → unknown.
 */
export const readWorkerHealth = async (
  redis: Redis,
  key: string,
  activeWindowMs = QUEUE_BOUNDS.HEARTBEAT_ACTIVE_WINDOW_MS,
  logger?: QueueLogger
): Promise<WorkerHealthSnapshot> => {
  try {
    const raw = await redis.get(key);
    if (!raw) {
      return { status: "offline", lastHeartbeatAt: null, ageMs: null };
    }

    let lastHeartbeatAt: string | null = null;
    let ageMs: number | null = null;

    try {
      const parsed = JSON.parse(raw) as { at?: string };
      if (typeof parsed.at === "string") {
        lastHeartbeatAt = parsed.at;
        const then = Date.parse(parsed.at);
        if (!Number.isNaN(then)) {
          ageMs = Math.max(0, Date.now() - then);
        }
      }
    } catch {
      // Non-JSON heartbeat — treat presence as active if TTL is fresh.
      lastHeartbeatAt = null;
      ageMs = 0;
    }

    const status: WorkerStatus =
      ageMs === null || ageMs <= activeWindowMs ? "active" : "offline";

    return { status, lastHeartbeatAt, ageMs };
  } catch (error) {
    logger?.error?.("Failed to read worker heartbeat", error);
    return { status: "unknown", lastHeartbeatAt: null, ageMs: null };
  }
};
