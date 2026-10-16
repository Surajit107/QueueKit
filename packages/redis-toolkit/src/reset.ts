import type { Redis } from "ioredis";
import { REDIS_BOUNDS } from "./bounds.js";
import type { NamespaceGuard } from "./namespace.js";
import type { NamespaceResetResult } from "./types.js";

/**
 * Delete only keys under the configured namespace (SCAN + DEL batches).
 * Never touches keys outside the prefix.
 */
export const createResetHelpers = (client: Redis, ns: NamespaceGuard) => {
  const resetNamespace = async (): Promise<NamespaceResetResult> => {
    let deleted = 0;
    let cursor = "0";

    do {
      const [next, batch] = await client.scan(
        cursor,
        "MATCH",
        ns.matchPattern(),
        "COUNT",
        REDIS_BOUNDS.SCAN_COUNT
      );
      cursor = next;

      if (batch.length === 0) continue;

      for (const fullKey of batch) {
        ns.assertOwned(fullKey);
      }

      const count = await client.del(...batch);
      deleted += count;
    } while (cursor !== "0");

    return { deleted, prefix: ns.prefix };
  };

  return { resetNamespace };
};

export type ResetHelpers = ReturnType<typeof createResetHelpers>;
