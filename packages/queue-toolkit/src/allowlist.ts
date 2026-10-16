import { ErrorCode } from "@queuekit/shared";
import { QueueToolkitError } from "./errors.js";
import { QUEUE_BOUNDS } from "./defaults.js";

export type AllowlistConfig = {
  allowedQueues?: readonly string[];
  allowedJobTypes?: readonly string[];
};

export const assertAllowlistedQueue = (
  queueName: string,
  allowedQueues?: readonly string[]
): void => {
  if (!allowedQueues || allowedQueues.length === 0) {
    return;
  }

  if (!allowedQueues.includes(queueName)) {
    throw new QueueToolkitError(
      `Queue "${queueName}" is not allowlisted`,
      ErrorCode.QUEUE_NOT_ALLOWLISTED
    );
  }
};

export const assertAllowlistedJobType = (
  jobType: string,
  allowedJobTypes?: readonly string[]
): void => {
  if (!allowedJobTypes || allowedJobTypes.length === 0) {
    return;
  }

  if (!allowedJobTypes.includes(jobType)) {
    throw new QueueToolkitError(
      `Job type "${jobType}" is not allowlisted`,
      ErrorCode.JOB_TYPE_NOT_ALLOWLISTED
    );
  }
};

export const assertPayloadWithinBounds = (payload: unknown): void => {
  let serialized: string;
  try {
    serialized = JSON.stringify(payload ?? {});
  } catch {
    throw new QueueToolkitError(
      "Job payload is not JSON-serializable",
      ErrorCode.VALIDATION_FAILED
    );
  }

  const bytes = Buffer.byteLength(serialized, "utf8");
  if (bytes > QUEUE_BOUNDS.MAX_PAYLOAD_BYTES) {
    throw new QueueToolkitError(
      `Job payload exceeds ${QUEUE_BOUNDS.MAX_PAYLOAD_BYTES} bytes`,
      ErrorCode.VALIDATION_FAILED
    );
  }
};

export const assertEnqueueOptionBounds = (options: {
  delayMs?: number;
  priority?: number;
}): void => {
  if (
    options.delayMs !== undefined &&
    (options.delayMs < 0 || options.delayMs > QUEUE_BOUNDS.MAX_DELAY_MS)
  ) {
    throw new QueueToolkitError(
      `delayMs must be between 0 and ${QUEUE_BOUNDS.MAX_DELAY_MS}`,
      ErrorCode.VALIDATION_FAILED
    );
  }

  if (
    options.priority !== undefined &&
    (options.priority < QUEUE_BOUNDS.MIN_PRIORITY ||
      options.priority > QUEUE_BOUNDS.MAX_PRIORITY)
  ) {
    throw new QueueToolkitError(
      `priority must be between ${QUEUE_BOUNDS.MIN_PRIORITY} and ${QUEUE_BOUNDS.MAX_PRIORITY}`,
      ErrorCode.VALIDATION_FAILED
    );
  }
};
