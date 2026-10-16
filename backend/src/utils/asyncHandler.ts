import type { NextFunction, Request, RequestHandler, Response } from "express";

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => unknown | Promise<unknown>;

/**
 * Wraps async route handlers so rejected promises reach the error middleware.
 */
const asyncHandler = (requestHandler: AsyncRequestHandler): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err: unknown) =>
      next(err)
    );
  };
};

export { asyncHandler };
