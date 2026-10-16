import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { ApiError, ErrorCode } from "@queuekit/shared";
import { getEnv } from "@/config/env.js";
import logger from "@/logger/winston.logger.js";
import {
  sanitizeErrorDetails,
  sanitizeMessage,
} from "@/utils/sanitize.js";

/**
 * Central error middleware — never leaks stacks, secrets, or connection URLs.
 */
const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  let error: ApiError;
  const isProduction = safeIsProduction();

  if (err instanceof ApiError) {
    error = err;
  } else if (err instanceof ZodError) {
    const fieldErrors = err.issues.map((issue) => ({
      [issue.path.join(".") || "body"]: issue.message,
    }));
    error = new ApiError(
      400,
      "Received data is not valid",
      fieldErrors,
      "",
      ErrorCode.VALIDATION_FAILED
    );
  } else if (err instanceof Error) {
    const statusCode =
      "statusCode" in err && typeof err.statusCode === "number"
        ? err.statusCode
        : 500;
    error = new ApiError(
      statusCode,
      sanitizeMessage(err.message || "Something went wrong", {
        forceGeneric: isProduction && statusCode >= 500,
      }),
      [],
      err.stack,
      statusCode >= 500 ? ErrorCode.INTERNAL : undefined
    );
  } else {
    error = new ApiError(
      500,
      "Something went wrong",
      [],
      "",
      ErrorCode.INTERNAL
    );
  }

  const publicMessage = sanitizeMessage(error.message, {
    forceGeneric: isProduction && error.statusCode >= 500,
  });

  const response = {
    statusCode: error.statusCode,
    success: false as const,
    message: publicMessage,
    code: error.code,
    errors: sanitizeErrorDetails(error.errors) as unknown[],
    data: null,
  };

  // Log internally with redaction; never put stack on the wire.
  if (error.statusCode >= 500) {
    logger.error(sanitizeMessage(error.stack || error.message));
  } else {
    logger.warn(sanitizeMessage(error.message));
  }

  return res.status(error.statusCode).json(response);
};

const safeIsProduction = (): boolean => {
  try {
    return getEnv().NODE_ENV === "production";
  } catch {
    return process.env.NODE_ENV === "production";
  }
};

export { errorHandler };
