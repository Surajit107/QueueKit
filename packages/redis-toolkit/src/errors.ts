import { ErrorCode } from "@queuekit/shared";

export type RedisToolkitErrorCode =
  | typeof ErrorCode.NAMESPACE_VIOLATION
  | typeof ErrorCode.VALIDATION_FAILED
  | typeof ErrorCode.NOT_FOUND
  | typeof ErrorCode.DEPENDENCY_UNAVAILABLE
  | typeof ErrorCode.RATE_LIMITED
  | typeof ErrorCode.INTERNAL;

/**
 * Domain error for Redis toolkit operations (HTTP-agnostic).
 */
export class RedisToolkitError extends Error {
  public readonly code: RedisToolkitErrorCode;
  public readonly statusHint: number;

  constructor(
    message: string,
    code: RedisToolkitErrorCode,
    statusHint = 400
  ) {
    super(message);
    this.name = "RedisToolkitError";
    this.code = code;
    this.statusHint = statusHint;
  }
}
