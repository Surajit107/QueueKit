import { beforeEach, describe, expect, it, vi } from "vitest";
import { DemoJobTypeEnum, DemoQueueNameEnum, ErrorCode } from "@queuekit/shared";
import {
  disconnectRedis,
  setRedisInfrastructure,
} from "@/cache/redis.js";
import {
  disconnectQueues,
  setQueueInfrastructure,
} from "@/queues/index.js";
import { enqueueDemoJob } from "@/services/queue-demo.service.js";
import { requireQueueInfrastructure } from "@/utils/toolkitErrors.js";

describe("J. Lifecycle", () => {
  beforeEach(() => {
    setRedisInfrastructure(null);
    setQueueInfrastructure(null);
  });

  it("graceful shutdown closes Redis connection", async () => {
    const disconnect = vi.fn(async () => undefined);
    setRedisInfrastructure({
      disconnect,
      isReady: () => true,
      health: async () => ({ status: "connected", latencyMs: 1 }),
      prefix: "queuekit:demo:",
    } as never);

    await disconnectRedis();
    expect(disconnect).toHaveBeenCalledTimes(1);

    // Second call is a no-op after clearing the singleton.
    await disconnectRedis();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it("graceful shutdown closes BullMQ producers / workers", async () => {
    const close = vi.fn(async () => undefined);
    setQueueInfrastructure({
      close,
      enqueue: vi.fn(),
      listJobs: vi.fn(),
      getJob: vi.fn(),
      getMetrics: vi.fn(),
      resetQueue: vi.fn(),
      getOrCreateQueue: vi.fn(),
      createWorker: vi.fn(),
      createConnection: vi.fn(),
    } as never);

    await disconnectQueues();
    expect(close).toHaveBeenCalledTimes(1);

    await disconnectQueues();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("no new jobs accepted after shutdown begins", async () => {
    const close = vi.fn(async () => undefined);
    const enqueue = vi.fn();
    setQueueInfrastructure({
      close,
      enqueue,
      listJobs: vi.fn(),
      getJob: vi.fn(),
      getMetrics: vi.fn(),
      resetQueue: vi.fn(),
      getOrCreateQueue: vi.fn(),
      createWorker: vi.fn(),
      createConnection: vi.fn(),
    } as never);

    await disconnectQueues();

    try {
      requireQueueInfrastructure();
      expect.unreachable("expected queue infra to be unavailable");
    } catch (error) {
      expect(error).toMatchObject({
        statusCode: 503,
        code: ErrorCode.DEPENDENCY_UNAVAILABLE,
      });
    }

    await expect(
      enqueueDemoJob(DemoQueueNameEnum.DEMO, {
        type: DemoJobTypeEnum.ECHO,
        payload: {},
      })
    ).rejects.toMatchObject({
      statusCode: 503,
      code: ErrorCode.DEPENDENCY_UNAVAILABLE,
    });
    expect(enqueue).not.toHaveBeenCalled();
  });
});
