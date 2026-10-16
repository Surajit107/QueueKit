import type { Request, Response } from "express";
import { describe, expect, it } from "vitest";
import { ApiError, ErrorCode } from "@queuekit/shared";
import { errorHandler } from "@/middlewares/error.middlewares.js";
import {
  containsSensitiveData,
  sanitizeErrorDetails,
  sanitizeMessage,
} from "@/utils/sanitize.js";

describe("error sanitization", () => {
  it("detects connection URLs and secret-shaped strings", () => {
    expect(
      containsSensitiveData("Failed redis://:p4ss@127.0.0.1:6379/0")
    ).toBe(true);
    expect(containsSensitiveData("Authorization bearer abc")).toBe(true);
    expect(containsSensitiveData("Job not found")).toBe(false);
  });

  it("redacts sensitive messages", () => {
    expect(sanitizeMessage("connect redis://user:secret@host:6379")).toBe(
      "Something went wrong"
    );
    expect(sanitizeMessage("Queue is unavailable")).toBe(
      "Queue is unavailable"
    );
  });

  it("sanitizes nested error details", () => {
    const cleaned = sanitizeErrorDetails([
      { password: "hunter2", field: "ok" },
      "redis://localhost:6379",
    ]) as unknown[];

    expect(cleaned[0]).toEqual({ password: "[redacted]", field: "ok" });
    expect(cleaned[1]).toBe("Something went wrong");
  });

  it("error handler never returns stack or redis URLs", () => {
    const { res, getBody } = createMockResponse();
    errorHandler(
      new Error("ECONNREFUSED redis://:hunter2@127.0.0.1:6379"),
      {} as Request,
      res,
      () => undefined
    );

    const body = getBody();
    expect(body.stack).toBeUndefined();
    expect(body.message).toBe("Something went wrong");
    expect(JSON.stringify(body)).not.toMatch(/redis:\/\//i);
    expect(JSON.stringify(body)).not.toMatch(/hunter2/);
  });

  it("ApiError public body keeps code without stack", () => {
    const { res, getBody } = createMockResponse();
    errorHandler(
      new ApiError(
        400,
        "bad",
        [{ field: "x" }],
        "STACK",
        ErrorCode.VALIDATION_FAILED
      ),
      {} as Request,
      res,
      () => undefined
    );

    const body = getBody();
    expect(body).toMatchObject({
      statusCode: 400,
      success: false,
      code: ErrorCode.VALIDATION_FAILED,
    });
    expect(body.stack).toBeUndefined();
  });
});

const createMockResponse = (): {
  res: Response;
  getBody: () => Record<string, unknown>;
} => {
  let body: Record<string, unknown> = {};
  const res = {
    status(code: number) {
      body = { ...body, statusCode: code };
      return this;
    },
    json(payload: Record<string, unknown>) {
      body = { ...body, ...payload };
      return this;
    },
  } as unknown as Response;

  return {
    res,
    getBody: () => body,
  };
};
