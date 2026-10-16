/**
 * Stable public error codes for API clients. Messages stay human-readable;
 * codes stay machine-stable.
 */
export const ErrorCode = {
  VALIDATION_FAILED: "VALIDATION_FAILED",
  NOT_FOUND: "NOT_FOUND",
  RATE_LIMITED: "RATE_LIMITED",
  NAMESPACE_VIOLATION: "NAMESPACE_VIOLATION",
  QUEUE_NOT_ALLOWLISTED: "QUEUE_NOT_ALLOWLISTED",
  JOB_TYPE_NOT_ALLOWLISTED: "JOB_TYPE_NOT_ALLOWLISTED",
  CONFIRMATION_REQUIRED: "CONFIRMATION_REQUIRED",
  DEPENDENCY_UNAVAILABLE: "DEPENDENCY_UNAVAILABLE",
  NOT_IMPLEMENTED: "NOT_IMPLEMENTED",
  INTERNAL: "INTERNAL",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * Serializable public error body — never include stacks, secrets, or URLs.
 */
export type PublicErrorBody = {
  statusCode: number;
  success: false;
  message: string;
  code?: ErrorCode;
  errors: unknown[];
  data: null;
};

/**
 * Common Error class shared across QueueKit packages and the API.
 * HTTP middleware maps this to a sanitized PublicErrorBody.
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly data: null;
  public readonly success: false;
  public readonly errors: unknown[];
  public readonly code: ErrorCode | undefined;

  constructor(
    statusCode: number,
    message = "Something went wrong",
    errors: unknown[] = [],
    stack = "",
    code?: ErrorCode
  ) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.success = false;
    this.errors = errors;
    this.code = code;

    if (stack) {
      this.stack = stack;
    } else if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toPublicBody(): PublicErrorBody {
    return {
      statusCode: this.statusCode,
      success: false,
      message: this.message,
      code: this.code,
      errors: this.errors,
      data: null,
    };
  }
}
