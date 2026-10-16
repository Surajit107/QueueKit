import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";
import { ApiError, ErrorCode } from "@queuekit/shared";

type RequestTarget = "body" | "query" | "params";

/**
 * Zod validation middleware — assigns coerced values back onto the request.
 * Express 5 exposes `req.query` as a getter-only property, so we redefine it.
 */
export const validate =
  (schema: ZodTypeAny, target: RequestTarget = "body") =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req[target]);

    if (!parsed.success) {
      const extractedErrors = parsed.error.issues.map((issue) => ({
        [issue.path.join(".") || target]: issue.message,
      }));
      throw new ApiError(
        400,
        "Received data is not valid",
        extractedErrors,
        "",
        ErrorCode.VALIDATION_FAILED
      );
    }

    assignValidated(req, target, parsed.data);
    next();
  };

const assignValidated = (
  req: Request,
  target: RequestTarget,
  data: unknown
): void => {
  if (target === "body") {
    req.body = data;
    return;
  }

  try {
    Object.defineProperty(req, target, {
      value: data,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  } catch {
    // Fallback: mutate in place when redefinition is blocked.
    const current = req[target];
    if (current && typeof current === "object") {
      Object.assign(current as Record<string, unknown>, data as object);
    }
  }
};
