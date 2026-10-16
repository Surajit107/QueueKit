import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  AvailableDemoQueues,
  DemoJobTypeEnum,
  DemoQueueNameEnum,
  ErrorCode,
} from "@queuekit/shared";
import { setQueueInfrastructure } from "@/queues/index.js";
import {
  enqueueDemoJob,
  getDemoJob,
  getDemoQueueMetrics,
  listDemoJobs,
} from "@/services/queue-demo.service.js";

const createMockQueues = () => {
  const enqueue = vi.fn(async () => ({
    id: "1",
    name: DemoJobTypeEnum.ECHO,
    queueName: DemoQueueNameEnum.DEMO,
    state: "waiting" as const,
    data: { message: "hello" },
    result: null,
    failedReason: null,
    attemptsMade: 0,
    attemptsMax: 1,
    timestamp: Date.now(),
    processedOn: null,
    finishedOn: null,
    delay: null,
    priority: null,
  }));

  const listJobs = vi.fn(async () => []);
  const getJob = vi.fn(async () => {
    throw Object.assign(new Error("not found"), {
      name: "QueueToolkitError",
    });
  });
  const getMetrics = vi.fn(async () => ({
    queueName: DemoQueueNameEnum.DEMO,
    waiting: 0,
    active: 0,
    delayed: 0,
    completed: 1,
    failed: 0,
    paused: 0,
  }));
  const resetQueue = vi.fn(async () => ({
    queueName: DemoQueueNameEnum.DEMO,
  }));

  return {
    enqueue,
    listJobs,
    getJob,
    getMetrics,
    resetQueue,
    getOrCreateQueue: vi.fn(),
    createWorker: vi.fn(),
    createConnection: vi.fn(),
    close: vi.fn(),
  };
};

describe("queue-demo.service", () => {
  beforeEach(() => {
    setQueueInfrastructure(null);
  });

  it("rejects unknown queue names", async () => {
    await expect(
      enqueueDemoJob("not-a-demo-queue", {
        type: DemoJobTypeEnum.ECHO,
        payload: {},
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      code: ErrorCode.QUEUE_NOT_ALLOWLISTED,
    });
  });

  it("rejects when queue infrastructure is unavailable", async () => {
    await expect(
      enqueueDemoJob(DemoQueueNameEnum.DEMO, {
        type: DemoJobTypeEnum.ECHO,
        payload: {},
      })
    ).rejects.toBeInstanceOf(ApiError);

    await expect(
      enqueueDemoJob(DemoQueueNameEnum.DEMO, {
        type: DemoJobTypeEnum.ECHO,
        payload: {},
      })
    ).rejects.toMatchObject({
      statusCode: 503,
      code: ErrorCode.DEPENDENCY_UNAVAILABLE,
    });
  });

  it("enqueues allowlisted job via toolkit", async () => {
    const mock = createMockQueues();
    setQueueInfrastructure(mock as never);

    const job = await enqueueDemoJob(DemoQueueNameEnum.DEMO, {
      type: DemoJobTypeEnum.ECHO,
      payload: { message: "ping" },
      priority: 2,
      delayMs: 100,
    });

    expect(job.id).toBe("1");
    expect(mock.enqueue).toHaveBeenCalledWith(
      DemoQueueNameEnum.DEMO,
      DemoJobTypeEnum.ECHO,
      expect.objectContaining({ message: "ping" }),
      { delayMs: 100, priority: 2 }
    );
  });

  it("lists metrics and jobs for allowlisted queue", async () => {
    const mock = createMockQueues();
    setQueueInfrastructure(mock as never);

    await expect(listDemoJobs(DemoQueueNameEnum.DEMO)).resolves.toEqual([]);
    await expect(
      getDemoQueueMetrics(DemoQueueNameEnum.DEMO)
    ).resolves.toMatchObject({ completed: 1 });

    expect(AvailableDemoQueues).toContain(DemoQueueNameEnum.DEMO);
  });

  it("maps missing job through require path", async () => {
    const mock = createMockQueues();
    mock.getJob = vi.fn(async () => {
      const { QueueToolkitError } = await import("@queuekit/queue-toolkit");
      throw new QueueToolkitError(
        'Job "missing" not found',
        ErrorCode.NOT_FOUND,
        404
      );
    });
    setQueueInfrastructure(mock as never);

    await expect(
      getDemoJob(DemoQueueNameEnum.DEMO, "missing")
    ).rejects.toMatchObject({
      statusCode: 404,
      code: ErrorCode.NOT_FOUND,
    });
  });
});
