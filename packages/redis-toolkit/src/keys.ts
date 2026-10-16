import type { Redis } from "ioredis";
import { ErrorCode } from "@queuekit/shared";
import { REDIS_BOUNDS } from "./bounds.js";
import { RedisToolkitError } from "./errors.js";
import type { NamespaceGuard } from "./namespace.js";
import type { DemoKeyRecord } from "./types.js";

const assertStringValue = (value: string): void => {
  const bytes = Buffer.byteLength(value, "utf8");
  if (bytes < 1 || bytes > REDIS_BOUNDS.MAX_STRING_BYTES) {
    throw new RedisToolkitError(
      `Value must be 1–${REDIS_BOUNDS.MAX_STRING_BYTES} bytes`,
      ErrorCode.VALIDATION_FAILED
    );
  }
};

const assertTtl = (ttlSeconds: number | undefined): void => {
  if (ttlSeconds === undefined) return;
  if (
    !Number.isInteger(ttlSeconds) ||
    ttlSeconds < 1 ||
    ttlSeconds > REDIS_BOUNDS.MAX_TTL_SECONDS
  ) {
    throw new RedisToolkitError(
      `ttlSeconds must be 1–${REDIS_BOUNDS.MAX_TTL_SECONDS}`,
      ErrorCode.VALIDATION_FAILED
    );
  }
};

export const createKeyHelpers = (client: Redis, ns: NamespaceGuard) => {
  const setString = async (
    suffix: string,
    value: string,
    ttlSeconds?: number
  ): Promise<DemoKeyRecord> => {
    assertStringValue(value);
    assertTtl(ttlSeconds);
    const fullKey = ns.toFullKey(suffix);

    if (ttlSeconds !== undefined) {
      await client.set(fullKey, value, "EX", ttlSeconds);
    } else {
      await client.set(fullKey, value);
    }

    const ttl = await client.ttl(fullKey);
    return {
      key: suffix,
      value,
      ttlSeconds: ttl >= 0 ? ttl : null,
    };
  };

  const getString = async (suffix: string): Promise<DemoKeyRecord> => {
    const fullKey = ns.toFullKey(suffix);
    const value = await client.get(fullKey);
    if (value === null) {
      throw new RedisToolkitError(
        `Key "${suffix}" not found`,
        ErrorCode.NOT_FOUND,
        404
      );
    }
    const ttl = await client.ttl(fullKey);
    return {
      key: suffix,
      value,
      ttlSeconds: ttl >= 0 ? ttl : null,
    };
  };

  const deleteKey = async (
    suffix: string
  ): Promise<{ key: string; deleted: boolean }> => {
    const fullKey = ns.toFullKey(suffix);
    const deleted = await client.del(fullKey);
    return { key: suffix, deleted: deleted > 0 };
  };

  /**
   * List relative key suffixes under the namespace (SCAN, capped).
   */
  const listKeys = async (): Promise<string[]> => {
    const keys: string[] = [];
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
      for (const fullKey of batch) {
        ns.assertOwned(fullKey);
        keys.push(ns.toSuffix(fullKey));
        if (keys.length >= REDIS_BOUNDS.MAX_KEYS_LIST) {
          return keys;
        }
      }
    } while (cursor !== "0");

    return keys;
  };

  return { setString, getString, deleteKey, listKeys };
};

export type KeyHelpers = ReturnType<typeof createKeyHelpers>;
