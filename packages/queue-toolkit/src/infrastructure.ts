import {
  Queue,
  Worker,
  type ConnectionOptions,
  type JobsOptions,
  type Processor,
} from "bullmq";
import type { Redis, RedisOptions } from "ioredis";
import { ErrorCode } from "@queuekit/shared";
import {
  assertAllowlistedJobType,
  assertAllowlistedQueue,
  assertEnqueueOptionBounds,
  assertPayloadWithinBounds,
} from "./allowlist.js";
import { createBullmqConnection } from "./connection.js";
import {
  DEFAULT_JOB_RETENTION,
  DEFAULT_RETRY_OPTIONS,
  QUEUE_BOUNDS,
} from "./defaults.js";
import { QueueToolkitError } from "./errors.js";
import { mapJobToView } from "./job-mapper.js";
import type {
  EnqueueOptions,
  JobState,
  JobView,
  ListJobsOptions,
  QueueInfrastructureOptions,
  QueueLogger,
  QueueMetrics,
  WorkerFactoryOptions,
} from "./types.js";

const DEFAULT_LIST_STATES: JobState[] = [
  "waiting",
  "active",
  "delayed",
  "completed",
  "failed",
];

/**
 * BullMQ queue factory + inspection helpers.
 * Callers own config and processors; this class owns producer lifecycle.
 */
export class QueueInfrastructure {
  private readonly logger: QueueLogger | undefined;
  private readonly allowedQueues: readonly string[] | undefined;
  private readonly allowedJobTypes: readonly string[] | undefined;
  private readonly jobTypesWithRetry: readonly string[];
  private readonly defaultJobOptions: JobsOptions;
  private readonly connection: ConnectionOptions;
  private readonly ownedConnections: Redis[] = [];
  private readonly queues = new Map<string, Queue>();
  private readonly workers = new Set<Worker>();
  private closed = false;

  constructor(options: QueueInfrastructureOptions) {
    this.logger = options.logger;
    this.allowedQueues = options.allowedQueues;
    this.allowedJobTypes = options.allowedJobTypes;
    this.jobTypesWithRetry = options.jobTypesWithRetry ?? [];
    this.defaultJobOptions = {
      ...DEFAULT_JOB_RETENTION,
      ...options.defaultJobOptions,
    };

    if (options.client) {
      this.connection = options.client;
    } else if (options.connection) {
      this.connection = options.connection;
    } else if (options.url?.trim()) {
      const conn = createBullmqConnection(options.url, options.redisOptions);
      this.ownedConnections.push(conn);
      this.connection = conn;
    } else {
      throw new QueueToolkitError(
        "Redis url or connection is required",
        ErrorCode.VALIDATION_FAILED
      );
    }
  }

  /**
   * Create a dedicated BullMQ connection (for workers / QueueEvents).
   */
  createConnection(url: string, redisOptions?: RedisOptions): Redis {
    const conn = createBullmqConnection(url, redisOptions);
    this.ownedConnections.push(conn);
    return conn;
  }

  getOrCreateQueue(queueName: string): Queue {
    this.assertOpen();
    assertAllowlistedQueue(queueName, this.allowedQueues);

    const existing = this.queues.get(queueName);
    if (existing) {
      return existing;
    }

    const queue = new Queue(queueName, {
      connection: this.connection,
      defaultJobOptions: this.defaultJobOptions,
    });
    this.queues.set(queueName, queue);
    this.logger?.info?.(`Queue ready: ${queueName}`);
    return queue;
  }

  async enqueue(
    queueName: string,
    jobType: string,
    payload: unknown,
    options: EnqueueOptions = {}
  ): Promise<JobView> {
    this.assertOpen();
    assertAllowlistedQueue(queueName, this.allowedQueues);
    assertAllowlistedJobType(jobType, this.allowedJobTypes);
    assertPayloadWithinBounds(payload);
    assertEnqueueOptionBounds(options);

    const queue = this.getOrCreateQueue(queueName);
    const jobOptions = this.buildJobOptions(jobType, options);

    const job = await queue.add(jobType, payload ?? {}, jobOptions);
    return mapJobToView(job, queueName);
  }

  async getJob(queueName: string, jobId: string): Promise<JobView> {
    this.assertOpen();
    assertAllowlistedQueue(queueName, this.allowedQueues);

    const queue = this.getOrCreateQueue(queueName);
    const job = await queue.getJob(jobId);
    if (!job) {
      throw new QueueToolkitError(
        `Job "${jobId}" not found`,
        ErrorCode.NOT_FOUND,
        404
      );
    }
    return mapJobToView(job, queueName);
  }

  async listJobs(
    queueName: string,
    options: ListJobsOptions = {}
  ): Promise<JobView[]> {
    this.assertOpen();
    assertAllowlistedQueue(queueName, this.allowedQueues);

    const queue = this.getOrCreateQueue(queueName);
    const start = options.start ?? 0;
    const end = Math.min(
      options.end ?? QUEUE_BOUNDS.MAX_JOBS_LIST - 1,
      start + QUEUE_BOUNDS.MAX_JOBS_LIST - 1
    );
    const states = (options.states ?? DEFAULT_LIST_STATES).filter(
      (state): state is Exclude<JobState, "unknown"> => state !== "unknown"
    );

    const jobs = await queue.getJobs(states, start, end, false);
    const views = await Promise.all(
      jobs.map((job) => mapJobToView(job, queueName))
    );
    return views;
  }

  async getMetrics(queueName: string): Promise<QueueMetrics> {
    this.assertOpen();
    assertAllowlistedQueue(queueName, this.allowedQueues);

    const queue = this.getOrCreateQueue(queueName);
    const counts = await queue.getJobCounts(
      "waiting",
      "active",
      "delayed",
      "completed",
      "failed",
      "paused"
    );

    return {
      queueName,
      waiting: counts.waiting ?? 0,
      active: counts.active ?? 0,
      delayed: counts.delayed ?? 0,
      completed: counts.completed ?? 0,
      failed: counts.failed ?? 0,
      paused: counts.paused ?? 0,
    };
  }

  /**
   * Obliterate allowlisted demo queue data (jobs + meta). Use for demo reset only.
   */
  async resetQueue(queueName: string): Promise<{ queueName: string }> {
    this.assertOpen();
    assertAllowlistedQueue(queueName, this.allowedQueues);

    const queue = this.getOrCreateQueue(queueName);
    await queue.obliterate({ force: true });
    return { queueName };
  }

  createWorker(
    queueName: string,
    processor: Processor,
    options: WorkerFactoryOptions = {}
  ): Worker {
    this.assertOpen();
    assertAllowlistedQueue(queueName, this.allowedQueues);

    const connection = options.connection ?? this.connection;
    const worker = new Worker(queueName, processor, {
      connection,
      concurrency: options.concurrency ?? QUEUE_BOUNDS.WORKER_CONCURRENCY,
    });

    worker.on("error", (error) => {
      this.logger?.error?.(`Worker error on ${queueName}`, error);
    });

    this.workers.add(worker);
    this.logger?.info?.(
      `Worker started: ${queueName} (concurrency=${options.concurrency ?? QUEUE_BOUNDS.WORKER_CONCURRENCY})`
    );
    return worker;
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;

    const workerClosures = [...this.workers].map(async (worker) => {
      try {
        await worker.close();
      } catch (error) {
        this.logger?.error?.("Failed to close worker", error);
      }
    });
    await Promise.all(workerClosures);
    this.workers.clear();

    const queueClosures = [...this.queues.values()].map(async (queue) => {
      try {
        await queue.close();
      } catch (error) {
        this.logger?.error?.("Failed to close queue", error);
      }
    });
    await Promise.all(queueClosures);
    this.queues.clear();

    for (const conn of this.ownedConnections) {
      try {
        await conn.quit();
      } catch {
        try {
          conn.disconnect();
        } catch {
          /* ignore */
        }
      }
    }
    this.ownedConnections.length = 0;
    this.logger?.info?.("Queue infrastructure closed");
  }

  private buildJobOptions(
    jobType: string,
    options: EnqueueOptions
  ): JobsOptions {
    const base: JobsOptions = {
      ...this.defaultJobOptions,
    };

    // Configured job types (e.g. failure simulation) get retry/backoff.
    if (this.jobTypesWithRetry.includes(jobType)) {
      Object.assign(base, DEFAULT_RETRY_OPTIONS);
    }

    if (options.attempts !== undefined) {
      base.attempts = options.attempts;
    }
    if (options.backoff !== undefined) {
      base.backoff = options.backoff;
    }
    if (options.delayMs !== undefined) {
      base.delay = options.delayMs;
    }
    if (options.priority !== undefined) {
      base.priority = options.priority;
    }
    if (options.jobId !== undefined) {
      base.jobId = options.jobId;
    }

    return base;
  }

  private assertOpen(): void {
    if (this.closed) {
      throw new QueueToolkitError(
        "Queue infrastructure is closed",
        ErrorCode.DEPENDENCY_UNAVAILABLE,
        503
      );
    }
  }
}

export const createQueueInfrastructure = (
  options: QueueInfrastructureOptions
): QueueInfrastructure => new QueueInfrastructure(options);
