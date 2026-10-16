/**
 * Demo Redis key namespace. Always prefix; never accept raw user keys.
 */
export const DEMO_REDIS_NAMESPACE = "queuekit:demo:" as const;

/**
 * Allowlisted demo queue names.
 */
export const DemoQueueNameEnum = {
  DEMO: "queuekit-demo",
} as const;

export type DemoQueueName =
  (typeof DemoQueueNameEnum)[keyof typeof DemoQueueNameEnum];

export const AvailableDemoQueues = Object.values(DemoQueueNameEnum);

/**
 * Allowlisted demo job types.
 */
export const DemoJobTypeEnum = {
  ECHO: "echo",
  DELAY: "delay",
  FAIL: "fail",
} as const;

export type DemoJobType =
  (typeof DemoJobTypeEnum)[keyof typeof DemoJobTypeEnum];

export const AvailableDemoJobTypes = Object.values(DemoJobTypeEnum);

/**
 * Allowlisted demo Redis Pub/Sub channel suffixes (not keys).
 * Full Redis channel = DEMO_REDIS_NAMESPACE + DEMO_PUBSUB_RELATIVE_PREFIX + suffix
 * e.g. queuekit:demo:pubsub:lobby
 */
export const DemoPubSubChannelEnum = {
  LOBBY: "lobby",
  LAB: "lab",
} as const;

export type DemoPubSubChannel =
  (typeof DemoPubSubChannelEnum)[keyof typeof DemoPubSubChannelEnum];

export const AvailableDemoPubSubChannels = Object.values(DemoPubSubChannelEnum);

/** Relative channel infix under the demo namespace. */
export const DEMO_PUBSUB_RELATIVE_PREFIX = "pubsub:" as const;

export const toPubSubRelativeChannel = (
  channel: DemoPubSubChannel
): string => `${DEMO_PUBSUB_RELATIVE_PREFIX}${channel}`;

/**
 * Allowlisted SSE event types for the public demo.
 */
export const DemoEventEnum = {
  JOB_WAITING: "job.waiting",
  JOB_ACTIVE: "job.active",
  JOB_COMPLETED: "job.completed",
  JOB_FAILED: "job.failed",
  REDIS_KEY_CHANGED: "redis.key.changed",
  REDIS_PUBSUB_MESSAGE: "redis.pubsub.message",
} as const;

export type DemoEvent = (typeof DemoEventEnum)[keyof typeof DemoEventEnum];

export const AvailableDemoEvents = Object.values(DemoEventEnum);

/**
 * Worker heartbeat key suffix (full key = namespace + suffix).
 */
export const WORKER_HEARTBEAT_KEY = "worker:heartbeat";
