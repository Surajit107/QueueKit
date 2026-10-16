import type { JobsOptions } from "bullmq";

/**
 * Hard caps for public demo / reusable helpers — avoid exhausting free Redis.
 */
export const QUEUE_BOUNDS = {
  MAX_PAYLOAD_BYTES: 2_048,
  MAX_JOBS_LIST: 50,
  MAX_DELAY_MS: 60_000,
  MIN_PRIORITY: 1,
  MAX_PRIORITY: 10,
  DEFAULT_ATTEMPTS: 3,
  HEARTBEAT_INTERVAL_MS: 5_000,
  HEARTBEAT_TTL_SECONDS: 30,
  /** Heartbeat newer than this → worker "active". */
  HEARTBEAT_ACTIVE_WINDOW_MS: 15_000,
  WORKER_CONCURRENCY: 2,
} as const;

/**
 * Bounded retention — completed/failed jobs are trimmed automatically.
 */
export const DEFAULT_JOB_RETENTION = {
  removeOnComplete: {
    count: 50,
    age: 3_600,
  },
  removeOnFail: {
    count: 50,
    age: 86_400,
  },
} as const satisfies Pick<JobsOptions, "removeOnComplete" | "removeOnFail">;

/**
 * Default retry / backoff for failure-simulation and flaky demo jobs.
 */
export const DEFAULT_RETRY_OPTIONS: Pick<JobsOptions, "attempts" | "backoff"> = {
  attempts: QUEUE_BOUNDS.DEFAULT_ATTEMPTS,
  backoff: {
    type: "exponential",
    delay: 1_000,
  },
};
