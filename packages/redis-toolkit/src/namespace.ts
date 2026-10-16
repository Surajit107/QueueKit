import { ErrorCode } from "@queuekit/shared";
import { REDIS_BOUNDS } from "./bounds.js";
import { RedisToolkitError } from "./errors.js";

const SUFFIX_PATTERN = /^[a-zA-Z0-9:_-]+$/;

export type NamespaceGuard = {
  prefix: string;
  toFullKey: (suffix: string) => string;
  toSuffix: (fullKey: string) => string;
  assertOwned: (fullKey: string) => void;
  assertValidSuffix: (suffix: string) => void;
  matchPattern: () => string;
};

/**
 * Enforce a single key prefix. Callers always pass relative suffixes —
 * never raw Redis keys from the public surface.
 */
export const createNamespaceGuard = (keyPrefix: string): NamespaceGuard => {
  const prefix = keyPrefix.trim();
  if (!prefix || !prefix.endsWith(":")) {
    throw new RedisToolkitError(
      "keyPrefix must be a non-empty string ending with ':'",
      ErrorCode.VALIDATION_FAILED
    );
  }

  const assertValidSuffix = (suffix: string): void => {
    if (!suffix || suffix.length > REDIS_BOUNDS.MAX_KEY_SUFFIX_LENGTH) {
      throw new RedisToolkitError(
        `Key suffix must be 1–${REDIS_BOUNDS.MAX_KEY_SUFFIX_LENGTH} characters`,
        ErrorCode.VALIDATION_FAILED
      );
    }
    if (!SUFFIX_PATTERN.test(suffix)) {
      throw new RedisToolkitError(
        "Key may only contain letters, numbers, :, _, -",
        ErrorCode.VALIDATION_FAILED
      );
    }
    if (suffix.startsWith(prefix) || suffix.includes("*") || suffix.includes("?")) {
      throw new RedisToolkitError(
        "Key suffix must be relative and must not contain wildcards",
        ErrorCode.NAMESPACE_VIOLATION,
        403
      );
    }
  };

  const toFullKey = (suffix: string): string => {
    assertValidSuffix(suffix);
    return `${prefix}${suffix}`;
  };

  const assertOwned = (fullKey: string): void => {
    if (!fullKey.startsWith(prefix)) {
      throw new RedisToolkitError(
        "Key is outside the demo namespace",
        ErrorCode.NAMESPACE_VIOLATION,
        403
      );
    }
  };

  const toSuffix = (fullKey: string): string => {
    assertOwned(fullKey);
    return fullKey.slice(prefix.length);
  };

  return {
    prefix,
    toFullKey,
    toSuffix,
    assertOwned,
    assertValidSuffix,
    matchPattern: () => `${prefix}*`,
  };
};
