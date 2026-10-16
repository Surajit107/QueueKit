/**
 * Liveness-only health payload (process up).
 */
export type HealthStatus = {
  status: "ok";
};

/**
 * Honest dependency status values — never fabricate "healthy".
 */
export type DependencyStatus =
  | "connected"
  | "disconnected"
  | "unknown"
  | "offline";

export type WorkerStatus = "active" | "unknown" | "offline";

/**
 * Aggregated system status for GET /api/v1/status.
 * Never fabricates healthy values — unknown/offline are valid.
 */
export type SystemStatus = {
  api: "ok";
  redis: DependencyStatus;
  worker: WorkerStatus;
  /** ISO timestamp of last observed worker heartbeat; null if unavailable. */
  workerHeartbeatAt: string | null;
  /**
   * Operational hints (cold start, polling fallback). Not SLOs.
   */
  notes: string[];
};
