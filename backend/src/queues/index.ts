import {
  createQueueInfrastructure,
  type QueueInfrastructure,
} from "@queuekit/queue-toolkit";
import {
  AvailableDemoJobTypes,
  AvailableDemoQueues,
  DemoJobTypeEnum,
} from "@queuekit/shared";
import { getEnv } from "@/config/env.js";
import logger from "@/logger/winston.logger.js";

let infra: QueueInfrastructure | null = null;

const isVitest = (): boolean =>
  typeof process.env.VITEST !== "undefined" ||
  process.env.NODE_ENV === "test";

export const getQueueInfrastructure = (): QueueInfrastructure | null => infra;

/**
 * Inject queue factory from `@queuekit/queue-toolkit`.
 * Under Vitest, skipped unless FORCE_REDIS_CONNECT=true (same Redis gate).
 */
export const connectQueues = async (): Promise<QueueInfrastructure | null> => {
  if (isVitest() && process.env.FORCE_REDIS_CONNECT !== "true") {
    return null;
  }

  if (infra) {
    return infra;
  }

  const env = getEnv();

  infra = createQueueInfrastructure({
    url: env.REDIS_URL.trim(),
    allowedQueues: AvailableDemoQueues,
    allowedJobTypes: AvailableDemoJobTypes,
    jobTypesWithRetry: [DemoJobTypeEnum.FAIL],
    logger: {
      info: (message) => logger.info(message),
      warn: (message) => logger.warn(message),
      error: (message, error) => logger.error(`${message}: `, error),
    },
  });

  // Eagerly open the allowlisted demo queue so retention defaults apply.
  for (const name of AvailableDemoQueues) {
    infra.getOrCreateQueue(name);
  }

  logger.info("Queue infrastructure ready");
  return infra;
};

/**
 * Test / DI helper — inject a pre-built infrastructure instance.
 */
export const setQueueInfrastructure = (
  instance: QueueInfrastructure | null
): void => {
  infra = instance;
};

export const disconnectQueues = async (): Promise<void> => {
  if (!infra) return;
  const current = infra;
  infra = null;
  await current.close();
};

export default connectQueues;
