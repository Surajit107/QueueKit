import type { ConnectionOptions, JobsOptions, Processor } from "bullmq";
import type { Redis, RedisOptions } from "ioredis";
import type { WorkerStatus } from "@queuekit/shared";

export type QueueLogger = {
  info?: (message: string) => void;
  warn?: (message: string) => void;
  error?: (message: string, error?: unknown) => void;
};

export type QueueInfrastructureOptions = {
  /** Redis connection URL (required when no connection/client injected). */
  url?: string;
  /**
   * Shared BullMQ connection options. Prefer this for producers.
   * Workers should use a dedicated connection (see createBullmqConnection).
   */
  connection?: ConnectionOptions;
  /** Inject an existing ioredis client (tests). */
  client?: Redis;
  redisOptions?: RedisOptions;
  /** When set, only these queue names may be created / used. */
  allowedQueues?: readonly string[];
  /** When set, only these job names/types may be enqueued. */
  allowedJobTypes?: readonly string[];
  /**
   * Job types that receive default retry/backoff options on enqueue
   * (e.g. failure-simulation demos).
   */
  jobTypesWithRetry?: readonly string[];
  defaultJobOptions?: JobsOptions;
  logger?: QueueLogger;
};

export type EnqueueOptions = {
  delayMs?: number;
  priority?: number;
  attempts?: number;
  backoff?: JobsOptions["backoff"];
  jobId?: string;
};

export type JobState =
  | "waiting"
  | "active"
  | "delayed"
  | "completed"
  | "failed"
  | "paused"
  | "unknown";

export type JobView = {
  id: string;
  name: string;
  queueName: string;
  state: JobState;
  data: unknown;
  result: unknown;
  failedReason: string | null;
  attemptsMade: number;
  attemptsMax: number | null;
  timestamp: number | null;
  processedOn: number | null;
  finishedOn: number | null;
  delay: number | null;
  priority: number | null;
};

export type QueueMetrics = {
  queueName: string;
  waiting: number;
  active: number;
  delayed: number;
  completed: number;
  failed: number;
  paused: number;
};

export type ListJobsOptions = {
  start?: number;
  end?: number;
  states?: JobState[];
};

export type WorkerFactoryOptions = {
  concurrency?: number;
  /** Dedicated connection for the worker (recommended). */
  connection?: ConnectionOptions;
};

export type HeartbeatReporterOptions = {
  /** Full Redis key (already namespaced by caller). */
  key: string;
  /** Redis client used only for SET/GET heartbeat. */
  redis: Redis;
  intervalMs?: number;
  ttlSeconds?: number;
  logger?: QueueLogger;
};

export type WorkerHealthSnapshot = {
  status: WorkerStatus;
  lastHeartbeatAt: string | null;
  ageMs: number | null;
};

export type DemoJobProcessor = Processor;
