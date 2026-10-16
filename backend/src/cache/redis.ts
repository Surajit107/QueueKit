import {
  createRedisInfrastructure,
  type RedisInfrastructure,
} from "@queuekit/redis-toolkit";
import { DEMO_REDIS_NAMESPACE } from "@queuekit/shared";
import { getEnv } from "@/config/env.js";
import logger from "@/logger/winston.logger.js";

let infra: RedisInfrastructure | null = null;

const isVitest = (): boolean =>
  typeof process.env.VITEST !== "undefined" ||
  process.env.NODE_ENV === "test";

export const getRedisKeyPrefix = (): string => {
  try {
    return getEnv().REDIS_KEY_PREFIX;
  } catch {
    return (process.env.REDIS_KEY_PREFIX || DEMO_REDIS_NAMESPACE).trim();
  }
};

export const redisKey = (suffix: string): string => {
  if (infra) {
    return infra.toFullKey(suffix);
  }
  return `${getRedisKeyPrefix()}${suffix}`;
};

export const getRedisInfrastructure = (): RedisInfrastructure | null => infra;

export const getRedisClient = () => infra?.getClient() ?? null;

export const isRedisReady = (): boolean => Boolean(infra?.isReady());

/**
 * Connect via `@queuekit/redis-toolkit` — single shared connection.
 * Under Vitest, connection is skipped unless FORCE_REDIS_CONNECT=true.
 */
export const connectRedis = async (): Promise<RedisInfrastructure | null> => {
  if (isVitest() && process.env.FORCE_REDIS_CONNECT !== "true") {
    return null;
  }

  if (infra?.isReady()) {
    return infra;
  }

  const env = getEnv();

  if (infra) {
    await infra.disconnect();
    infra = null;
  }

  const next = createRedisInfrastructure({
    url: env.REDIS_URL.trim(),
    keyPrefix: env.REDIS_KEY_PREFIX,
    logger: {
      info: (message) => logger.info(message),
      error: (message, error) => logger.error(`${message}: `, error),
    },
  });

  await next.connect();
  infra = next;
  return infra;
};

/**
 * Test / DI helper — inject a pre-built infrastructure instance.
 */
export const setRedisInfrastructure = (
  instance: RedisInfrastructure | null
): void => {
  infra = instance;
};

export const disconnectRedis = async (): Promise<void> => {
  const { shutdownDemoPubSub } = await import(
    "@/services/pubsub-demo.service.js"
  );
  await shutdownDemoPubSub();

  if (!infra) return;
  const current = infra;
  infra = null;
  await current.disconnect();
};

export default connectRedis;
