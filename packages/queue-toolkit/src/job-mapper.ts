import type { Job } from "bullmq";
import type { JobState, JobView } from "./types.js";

const KNOWN_STATES = new Set<JobState>([
  "waiting",
  "active",
  "delayed",
  "completed",
  "failed",
  "paused",
]);

export const toJobState = (raw: string): JobState => {
  if (KNOWN_STATES.has(raw as JobState)) {
    return raw as JobState;
  }
  // BullMQ may report "waiting-children" / "prioritized" etc.
  if (raw === "waiting-children" || raw === "prioritized") {
    return "waiting";
  }
  return "unknown";
};

/**
 * Map a BullMQ Job into a sanitized public view (no internal Redis keys).
 */
export const mapJobToView = async (
  job: Job,
  queueName: string
): Promise<JobView> => {
  const rawState = await job.getState();
  const opts = job.opts;

  return {
    id: String(job.id ?? ""),
    name: job.name,
    queueName,
    state: toJobState(rawState),
    data: job.data ?? {},
    result: job.returnvalue ?? null,
    failedReason: job.failedReason ? String(job.failedReason) : null,
    attemptsMade: job.attemptsMade,
    attemptsMax: typeof opts.attempts === "number" ? opts.attempts : null,
    timestamp: job.timestamp ?? null,
    processedOn: job.processedOn ?? null,
    finishedOn: job.finishedOn ?? null,
    delay: typeof opts.delay === "number" ? opts.delay : null,
    priority: typeof opts.priority === "number" ? opts.priority : null,
  };
};
