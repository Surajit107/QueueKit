import type { Request, Response } from "express";
import { ApiError, ApiResponse, DemoEventEnum, ErrorCode } from "@queuekit/shared";
import {
  getPubSubHubListenerCount,
  listDemoPubSubChannels,
  publishDemoPubSub,
  subscribeDemoPubSub,
} from "@/services/pubsub-demo.service.js";
import { asyncHandler } from "@/utils/asyncHandler.js";
import type {
  PublishPubSubInput,
  PubSubEventsQueryInput,
} from "@/validators/apps/redis/pubsub.validators.js";

const SSE_KEEPALIVE_MS = 15_000;
const MAX_SSE_LISTENERS = 40;

const listChannels = asyncHandler(async (_req, res) => {
  const data = listDemoPubSubChannels();
  return res
    .status(200)
    .json(new ApiResponse(200, data, "Demo Pub/Sub channels listed"));
});

const publish = asyncHandler(async (req: Request, res) => {
  const body = req.body as PublishPubSubInput;
  const result = await publishDemoPubSub(body);
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Demo Pub/Sub message published"));
});

/**
 * GET /api/v1/redis/demo/pubsub/events — SSE bridged from a real Redis subscriber.
 * One process-level Redis duplicate() connection is shared across SSE clients.
 */
const streamPubSubEvents = (req: Request, res: Response): void => {
  const query = req.query as unknown as PubSubEventsQueryInput;
  const allowed = new Set(query.channels ?? []);

  if (allowed.size === 0) {
    throw new ApiError(
      400,
      "No allowlisted Pub/Sub channels requested",
      [],
      "",
      ErrorCode.VALIDATION_FAILED
    );
  }

  if (getPubSubHubListenerCount() >= MAX_SSE_LISTENERS) {
    throw new ApiError(
      429,
      `Too many Pub/Sub listeners (max ${MAX_SSE_LISTENERS}). Close another tab and retry.`,
      [],
      "",
      ErrorCode.RATE_LIMITED
    );
  }

  res.status(200);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const writeComment = (text: string): void => {
    res.write(`: ${text}\n\n`);
  };

  const writeEvent = (event: string, data: Record<string, unknown>): void => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  writeComment(
    "QueueKit Redis Pub/Sub SSE — fire-and-forget; not durable; demo channels only"
  );
  writeEvent("connected", {
    channels: [...allowed],
    limitations: listDemoPubSubChannels().limitations,
  });

  let unsubscribe: (() => Promise<void>) | null = null;
  let cleaned = false;

  const keepAlive = setInterval(() => {
    writeComment("keepalive");
  }, SSE_KEEPALIVE_MS);
  keepAlive.unref?.();

  const cleanup = (): void => {
    if (cleaned) {
      return;
    }
    cleaned = true;
    clearInterval(keepAlive);
    if (unsubscribe) {
      void unsubscribe();
      unsubscribe = null;
    }
  };

  req.on("close", cleanup);
  req.on("aborted", cleanup);

  void subscribeDemoPubSub((payload) => {
    if (!allowed.has(payload.channel)) {
      return;
    }
    writeEvent(DemoEventEnum.REDIS_PUBSUB_MESSAGE, {
      type: DemoEventEnum.REDIS_PUBSUB_MESSAGE,
      at: payload.at,
      data: {
        channel: payload.channel,
        message: payload.message,
      },
    });
  })
    .then((release) => {
      if (cleaned) {
        void release();
        return;
      }
      unsubscribe = release;
    })
    .catch((error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Failed to subscribe to Redis Pub/Sub";
      writeEvent("error", {
        message,
        code: ErrorCode.DEPENDENCY_UNAVAILABLE,
      });
      cleanup();
      res.end();
    });
};

export { listChannels, publish, streamPubSubEvents };
