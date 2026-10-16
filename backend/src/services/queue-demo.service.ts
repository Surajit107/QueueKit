import {
  assertAllowlistedQueue,
  type JobView,
  type QueueMetrics,
} from "@queuekit/queue-toolkit";
import {
  AvailableDemoQueues,
  DemoEventEnum,
  DemoJobTypeEnum,
  type DemoJobType,
} from "@queuekit/shared";
import { demoEvents } from "@/services/demo-events.service.js";
import {
  mapToolkitError,
  requireQueueInfrastructure,
} from "@/utils/toolkitErrors.js";
import type {
  EnqueueJobInput,
  ListJobsQueryInput,
} from "@/validators/apps/queues/job.validators.js";

const assertDemoQueue = (queue: string): void => {
  assertAllowlistedQueue(queue, AvailableDemoQueues);
};

const buildPayload = (
  type: DemoJobType,
  payload: Record<string, unknown>
): Record<string, unknown> => {
  switch (type) {
    case DemoJobTypeEnum.ECHO:
      return {
        ...payload,
        message:
          typeof payload.message === "string" ? payload.message : "hello",
      };
    case DemoJobTypeEnum.DELAY:
      return {
        ...payload,
        waitMs:
          typeof payload.waitMs === "number"
            ? Math.min(Math.max(0, payload.waitMs), 5_000)
            : 250,
      };
    case DemoJobTypeEnum.FAIL:
      return {
        ...payload,
        message:
          typeof payload.message === "string"
            ? payload.message
            : "Simulated demo failure",
        failUntilAttempt:
          typeof payload.failUntilAttempt === "number"
            ? payload.failUntilAttempt
            : 99,
      };
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
};

export const enqueueDemoJob = async (
  queue: string,
  input: EnqueueJobInput
): Promise<JobView> => {
  try {
    assertDemoQueue(queue);
    const queues = requireQueueInfrastructure();
    const payload = buildPayload(input.type, input.payload);
    const job = await queues.enqueue(queue, input.type, payload, {
      delayMs: input.delayMs,
      priority: input.priority,
    });

    demoEvents.publish(DemoEventEnum.JOB_WAITING, {
      queue,
      jobId: job.id,
      name: job.name,
      state: job.state,
      delayMs: input.delayMs ?? null,
      priority: input.priority ?? null,
    });

    return job;
  } catch (error) {
    return mapToolkitError(error);
  }
};

export const listDemoJobs = async (
  queue: string,
  query: ListJobsQueryInput = {}
): Promise<JobView[]> => {
  try {
    assertDemoQueue(queue);
    const queues = requireQueueInfrastructure();
    return await queues.listJobs(queue, {
      start: query.start,
      end: query.end,
    });
  } catch (error) {
    return mapToolkitError(error);
  }
};

export const getDemoJob = async (
  queue: string,
  jobId: string
): Promise<JobView> => {
  try {
    assertDemoQueue(queue);
    const queues = requireQueueInfrastructure();
    return await queues.getJob(queue, jobId);
  } catch (error) {
    return mapToolkitError(error);
  }
};

export const getDemoQueueMetrics = async (
  queue: string
): Promise<QueueMetrics> => {
  try {
    assertDemoQueue(queue);
    const queues = requireQueueInfrastructure();
    return await queues.getMetrics(queue);
  } catch (error) {
    return mapToolkitError(error);
  }
};

/**
 * Clean all allowlisted demo queues (used by demo reset).
 */
export const resetDemoQueues = async (): Promise<{
  queues: string[];
}> => {
  const queues = requireQueueInfrastructure();
  const reset: string[] = [];

  try {
    for (const name of AvailableDemoQueues) {
      await queues.resetQueue(name);
      reset.push(name);
    }
    return { queues: reset };
  } catch (error) {
    return mapToolkitError(error);
  }
};
