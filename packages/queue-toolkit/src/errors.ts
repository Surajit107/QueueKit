import { ErrorCode } from "@queuekit/shared";

export type QueueToolkitErrorCode =
  | typeof ErrorCode.QUEUE_NOT_ALLOWLISTED
  | typeof ErrorCode.JOB_TYPE_NOT_ALLOWLISTED
  | typeof ErrorCode.VALIDATION_FAILED
  | typeof ErrorCode.NOT_FOUND
  | typeof ErrorCode.DEPENDENCY_UNAVAILABLE
  | typeof ErrorCode.INTERNAL;

/**
 * Domain error for queue toolkit operations (HTTP-agnostic).
 */
export class QueueToolkitError extends Error {
  public readonly code: QueueToolkitErrorCode;
  public readonly statusHint: number;

  constructor(
    message: string,
    code: QueueToolkitErrorCode,
    statusHint = 400
  ) {
    super(message);
    this.name = "QueueToolkitError";
    this.code = code;
    this.statusHint = statusHint;
  }
}
