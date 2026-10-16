import type { Job } from "bullmq";
import { DemoJobTypeEnum } from "@queuekit/shared";

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Demo processors — no external side effects (no email/SMS/payments).
 */
export const processDemoJob = async (
  job: Job<Record<string, unknown>>
): Promise<Record<string, unknown>> => {
  switch (job.name) {
    case DemoJobTypeEnum.ECHO:
      return {
        echoed: job.data,
        processedAt: new Date().toISOString(),
        jobId: job.id,
      };

    case DemoJobTypeEnum.DELAY: {
      const waitMs =
        typeof job.data.waitMs === "number" ? job.data.waitMs : 250;
      await sleep(Math.min(Math.max(0, waitMs), 5_000));
      return {
        waitedMs: waitMs,
        processedAt: new Date().toISOString(),
        jobId: job.id,
      };
    }

    case DemoJobTypeEnum.FAIL: {
      const failUntilAttempt =
        typeof job.data.failUntilAttempt === "number"
          ? job.data.failUntilAttempt
          : 99;
      // attemptsMade is 0-based before increment on failure path; after a
      // failed attempt BullMQ increments. Compare against current attempt index.
      const attemptNumber = job.attemptsMade + 1;
      if (attemptNumber <= failUntilAttempt) {
        const message =
          typeof job.data.message === "string"
            ? job.data.message
            : "Simulated demo failure";
        throw new Error(`${message} (attempt ${attemptNumber})`);
      }
      return {
        recovered: true,
        attemptsMade: job.attemptsMade,
        processedAt: new Date().toISOString(),
        jobId: job.id,
      };
    }

    default:
      throw new Error(`Unsupported demo job type: ${job.name}`);
  }
};
