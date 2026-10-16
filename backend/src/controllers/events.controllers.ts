import type { Request, Response } from "express";
import { demoEvents } from "@/services/demo-events.service.js";
import { ApiError, ErrorCode } from "@queuekit/shared";
import type { EventsQueryInput } from "@/validators/apps/events/events.validators.js";

const SSE_KEEPALIVE_MS = 15_000;

/**
 * GET /api/v1/events — SSE for allowlisted demo events.
 * Polling fallback: GET /api/v1/queues/:queue/jobs and GET /api/v1/status.
 */
const streamEvents = (req: Request, res: Response): void => {
  const query = req.query as unknown as EventsQueryInput;
  const allowed = new Set(query.types ?? []);

  if (allowed.size === 0) {
    throw new ApiError(
      400,
      "No allowlisted event types requested",
      [],
      "",
      ErrorCode.VALIDATION_FAILED
    );
  }

  res.status(200);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  // Hint for clients / proxies that may buffer.
  res.flushHeaders?.();

  const writeComment = (text: string): void => {
    res.write(`: ${text}\n\n`);
  };

  const writeEvent = (
    event: string,
    data: Record<string, unknown>
  ): void => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  writeComment(
    "QueueKit SSE — allowlisted demo events only. Polling fallback: GET /api/v1/queues/{queue}/jobs and GET /api/v1/status"
  );
  writeEvent("connected", {
    types: [...allowed],
    pollingFallback: [
      "GET /api/v1/queues/:queue/jobs",
      "GET /api/v1/queues/:queue/metrics",
      "GET /api/v1/status",
    ],
  });

  const unsubscribe = demoEvents.subscribe((payload) => {
    if (!allowed.has(payload.type)) {
      return;
    }
    writeEvent(payload.type, payload);
  });

  const keepAlive = setInterval(() => {
    writeComment("keepalive");
  }, SSE_KEEPALIVE_MS);
  keepAlive.unref?.();

  const cleanup = (): void => {
    clearInterval(keepAlive);
    unsubscribe();
  };

  req.on("close", cleanup);
  req.on("aborted", cleanup);
};

export { streamEvents };
