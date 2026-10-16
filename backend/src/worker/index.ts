import type { Worker } from "bullmq";
import {
  createHeartbeatReporter,
  type HeartbeatReporter,
} from "@queuekit/queue-toolkit";
import {
  AvailableDemoQueues,
  DemoEventEnum,
  WORKER_HEARTBEAT_KEY,
} from "@queuekit/shared";
import { getRedisClient, redisKey } from "@/cache/redis.js";
import { getEnv } from "@/config/env.js";
import logger from "@/logger/winston.logger.js";
import {
  getQueueInfrastructure,
  connectQueues,
} from "@/queues/index.js";
import { demoEvents } from "@/services/demo-events.service.js";
import { processDemoJob } from "@/worker/processors.js";

let workers: Worker[] = [];
let heartbeat: HeartbeatReporter | null = null;
let running = false;

/**
 * BullMQ worker bootstrap.
 * On free-tier Railway this runs in-process with the API when RUN_WORKER=true.
 */
export const startWorker = async (): Promise<void> => {
  if (running) return;

  const queues = getQueueInfrastructure() ?? (await connectQueues());
  if (!queues) {
    logger.warn("Worker not started — queue infrastructure unavailable");
    return;
  }

  const env = getEnv();
  const workerConnection = queues.createConnection(env.REDIS_URL.trim());

  workers = AvailableDemoQueues.map((queueName) =>
    queues.createWorker(queueName, processDemoJob, {
      connection: workerConnection,
    })
  );

  for (const worker of workers) {
    worker.on("active", (job) => {
      demoEvents.publish(DemoEventEnum.JOB_ACTIVE, {
        queue: job.queueName,
        jobId: job.id,
        name: job.name,
        attemptsMade: job.attemptsMade,
      });
    });
    worker.on("completed", (job) => {
      logger.info(`Job completed: ${job.id} (${job.name})`);
      demoEvents.publish(DemoEventEnum.JOB_COMPLETED, {
        queue: job.queueName,
        jobId: job.id,
        name: job.name,
        returnvalue: job.returnvalue ?? null,
      });
    });
    worker.on("failed", (job, error) => {
      logger.warn(
        `Job failed: ${job?.id ?? "unknown"} (${job?.name ?? "?"}): ${error.message}`
      );
      demoEvents.publish(DemoEventEnum.JOB_FAILED, {
        queue: job?.queueName ?? null,
        jobId: job?.id ?? null,
        name: job?.name ?? null,
        failedReason: error.message,
        attemptsMade: job?.attemptsMade ?? null,
      });
    });
  }

  const redis = getRedisClient();
  if (redis) {
    heartbeat = createHeartbeatReporter({
      key: redisKey(WORKER_HEARTBEAT_KEY),
      redis,
      logger: {
        info: (message) => logger.info(message),
        error: (message, error) => logger.error(`${message}: `, error),
      },
    });
    heartbeat.start();
  } else {
    logger.warn("Worker heartbeat skipped — Redis client not ready");
  }

  running = true;
  logger.info(
    `Worker started for queues: ${AvailableDemoQueues.join(", ")}`
  );
};

export const stopWorker = async (): Promise<void> => {
  if (heartbeat) {
    await heartbeat.stop();
    heartbeat = null;
  }

  // Workers are closed via QueueInfrastructure.close(); clear local refs.
  workers = [];
  running = false;
  logger.info("Worker stopped");
};

export const isWorkerRunning = (): boolean => running;
