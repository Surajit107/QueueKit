import { ApiError, DEMO_REDIS_NAMESPACE, ErrorCode } from "@queuekit/shared";
import {
  mapToolkitError,
  requireRedisInfrastructure,
} from "@/utils/toolkitErrors.js";
import { getQueueInfrastructure } from "@/queues/index.js";
import { resetDemoQueues } from "@/services/queue-demo.service.js";

/**
 * Reset namespaced demo Redis keys and allowlisted demo queues only.
 * Refuses to run against a non-demo Redis key prefix.
 */
export const resetDemoResources = async (
  confirm: boolean
): Promise<{
  deletedKeys: number;
  prefix: string;
  queuesReset: string[];
}> => {
  if (confirm !== true) {
    throw new ApiError(
      400,
      "Confirmation required to reset demo resources",
      [],
      "",
      ErrorCode.CONFIRMATION_REQUIRED
    );
  }

  const redis = requireRedisInfrastructure();
  assertDemoNamespace(redis.prefix);

  try {
    const result = await redis.reset.resetNamespace();

    let queuesReset: string[] = [];
    if (getQueueInfrastructure()) {
      const queueResult = await resetDemoQueues();
      queuesReset = queueResult.queues;
    }

    return {
      deletedKeys: result.deleted,
      prefix: result.prefix,
      queuesReset,
    };
  } catch (error) {
    return mapToolkitError(error);
  }
};

/**
 * Hard stop: never wipe a Redis DB that is not clearly demo-scoped.
 */
export const assertDemoNamespace = (prefix: string): void => {
  const normalized = prefix.trim().toLowerCase();
  const isDemoScoped =
    normalized === DEMO_REDIS_NAMESPACE ||
    normalized.includes("demo:") ||
    normalized.endsWith(":demo:") ||
    /demo/.test(normalized);

  if (!prefix.trim() || prefix.trim() === ":" || !isDemoScoped) {
    throw new ApiError(
      500,
      "Demo reset refused: Redis key prefix is not a demo namespace",
      [],
      "",
      ErrorCode.NAMESPACE_VIOLATION
    );
  }
};
