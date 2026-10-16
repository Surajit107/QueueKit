import { readWorkerHealth } from "@queuekit/queue-toolkit";
import type {
  DependencyStatus,
  SystemStatus,
  WorkerStatus,
} from "@queuekit/shared";
import { WORKER_HEARTBEAT_KEY } from "@queuekit/shared";
import {
  getRedisClient,
  getRedisInfrastructure,
  redisKey,
} from "@/cache/redis.js";
import { getEnv } from "@/config/env.js";
import { isWorkerRunning } from "@/worker/index.js";

const STATUS_NOTES = [
  "Free-tier demo: services may sleep; first request after idle can be slow.",
  "Redis data and jobs may disappear after restarts on ephemeral storage.",
  "Live updates: prefer GET /api/v1/events (SSE); poll jobs/status if SSE drops.",
] as const;

/**
 * Honest status probe — never fabricates healthy values.
 */
export const getSystemStatus = async (): Promise<SystemStatus> => {
  const infra = getRedisInfrastructure();
  let redis: DependencyStatus = "disconnected";

  if (infra) {
    const health = await infra.health();
    redis = health.status;
  }

  const { status: worker, lastHeartbeatAt } =
    await resolveWorkerHealth(redis);

  return {
    api: "ok",
    redis,
    worker,
    workerHeartbeatAt: lastHeartbeatAt,
    notes: [...STATUS_NOTES],
  };
};

const resolveWorkerHealth = async (
  redisStatus: DependencyStatus
): Promise<{ status: WorkerStatus; lastHeartbeatAt: string | null }> => {
  const redis = getRedisClient();
  if (!redis || redisStatus !== "connected") {
    if (isWorkerRunning()) {
      return { status: "active", lastHeartbeatAt: null };
    }
    try {
      return {
        status: getEnv().RUN_WORKER ? "unknown" : "offline",
        lastHeartbeatAt: null,
      };
    } catch {
      return { status: "unknown", lastHeartbeatAt: null };
    }
  }

  const snapshot = await readWorkerHealth(
    redis,
    redisKey(WORKER_HEARTBEAT_KEY)
  );

  if (snapshot.status === "active") {
    return {
      status: "active",
      lastHeartbeatAt: snapshot.lastHeartbeatAt,
    };
  }

  try {
    if (!getEnv().RUN_WORKER) {
      return {
        status: "offline",
        lastHeartbeatAt: snapshot.lastHeartbeatAt,
      };
    }
  } catch {
    /* env not loaded */
  }

  if (isWorkerRunning()) {
    return {
      status: "active",
      lastHeartbeatAt: snapshot.lastHeartbeatAt,
    };
  }

  return {
    status: snapshot.status,
    lastHeartbeatAt: snapshot.lastHeartbeatAt,
  };
};
