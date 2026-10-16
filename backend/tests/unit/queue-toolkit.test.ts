import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_JOB_RETENTION,
  DEFAULT_RETRY_OPTIONS,
  QUEUE_BOUNDS,
  assertPayloadWithinBounds,
  mapJobToView,
  toJobState,
  QueueToolkitError,
} from "@queuekit/queue-toolkit";
import {
  DemoJobTypeEnum,
  DemoQueueNameEnum,
  ErrorCode,
} from "@queuekit/shared";
import { setQueueInfrastructure } from "@/queues/index.js";
import {
  enqueueDemoJob,
  resetDemoQueues,
} from "@/services/queue-demo.service.js";

describe("F. Queue toolkit / queue services", () => {
  beforeEach(() => {
    setQueueInfrastructure(null);
  });

  it("maps job states waiting / active / delayed / completed / failed", async () => {
    expect(toJobState("waiting")).toBe("waiting");
    expect(toJobState("active")).toBe("active");
    expect(toJobState("delayed")).toBe("delayed");
    expect(toJobState("completed")).toBe("completed");
    expect(toJobState("failed")).toBe("failed");
    expect(toJobState("prioritized")).toBe("waiting");

    const view = await mapJobToView(
      {
        id: "42",
        name: "echo",
        data: { message: "hi" },
        opts: { attempts: 3, delay: 100, priority: 2 },
        attemptsMade: 1,
        returnvalue: { ok: true },
        failedReason: undefined,
        timestamp: 1,
        processedOn: 2,
        finishedOn: 3,
        getState: async () => "completed",
      } as never,
      DemoQueueNameEnum.DEMO
    );

    expect(view).toMatchObject({
      id: "42",
      state: "completed",
      attemptsMax: 3,
      delay: 100,
      priority: 2,
      result: { ok: true },
    });
  });

  it("enqueue rejects invalid oversize payload", () => {
    expect(() =>
      assertPayloadWithinBounds({
        blob: "x".repeat(QUEUE_BOUNDS.MAX_PAYLOAD_BYTES),
      })
    ).toThrow(QueueToolkitError);
  });

  it("retry / backoff defaults exist for failure-simulation jobs", () => {
    expect(DEFAULT_RETRY_OPTIONS.attempts).toBe(QUEUE_BOUNDS.DEFAULT_ATTEMPTS);
    expect(DEFAULT_RETRY_OPTIONS.backoff).toEqual({
      type: "exponential",
      delay: 1_000,
    });
  });

  it("retention policy bounds completed / failed jobs", () => {
    expect(DEFAULT_JOB_RETENTION.removeOnComplete).toEqual({
      count: 50,
      age: 3_600,
    });
    expect(DEFAULT_JOB_RETENTION.removeOnFail).toEqual({
      count: 50,
      age: 86_400,
    });
  });

  it("delayed job and priority options are passed through enqueue", async () => {
    const enqueue = vi.fn(async (_q, _t, _p, options) => ({
      id: "d1",
      name: DemoJobTypeEnum.ECHO,
      queueName: DemoQueueNameEnum.DEMO,
      state: "delayed" as const,
      data: { message: "later" },
      result: null,
      failedReason: null,
      attemptsMade: 0,
      attemptsMax: 1,
      timestamp: Date.now(),
      processedOn: null,
      finishedOn: null,
      delay: options?.delayMs ?? null,
      priority: options?.priority ?? null,
    }));

    setQueueInfrastructure({
      enqueue,
      listJobs: vi.fn(),
      getJob: vi.fn(),
      getMetrics: vi.fn(),
      resetQueue: vi.fn(),
      getOrCreateQueue: vi.fn(),
      createWorker: vi.fn(),
      createConnection: vi.fn(),
      close: vi.fn(),
    } as never);

    const job = await enqueueDemoJob(DemoQueueNameEnum.DEMO, {
      type: DemoJobTypeEnum.ECHO,
      payload: { message: "later" },
      delayMs: 5_000,
      priority: 3,
    });

    expect(enqueue).toHaveBeenCalledWith(
      DemoQueueNameEnum.DEMO,
      DemoJobTypeEnum.ECHO,
      expect.objectContaining({ message: "later" }),
      { delayMs: 5_000, priority: 3 }
    );
    expect(job.delay).toBe(5_000);
    expect(job.priority).toBe(3);
  });

  it("failure-simulation enqueue is allowlisted and harmless (no external side effects)", async () => {
    const enqueue = vi.fn(async () => ({
      id: "f1",
      name: DemoJobTypeEnum.FAIL,
      queueName: DemoQueueNameEnum.DEMO,
      state: "waiting" as const,
      data: { message: "Simulated demo failure" },
      result: null,
      failedReason: null,
      attemptsMade: 0,
      attemptsMax: 3,
      timestamp: Date.now(),
      processedOn: null,
      finishedOn: null,
      delay: null,
      priority: null,
    }));

    setQueueInfrastructure({
      enqueue,
      listJobs: vi.fn(),
      getJob: vi.fn(),
      getMetrics: vi.fn(),
      resetQueue: vi.fn(),
      getOrCreateQueue: vi.fn(),
      createWorker: vi.fn(),
      createConnection: vi.fn(),
      close: vi.fn(),
    } as never);

    await enqueueDemoJob(DemoQueueNameEnum.DEMO, {
      type: DemoJobTypeEnum.FAIL,
      payload: {},
    });

    expect(enqueue).toHaveBeenCalledWith(
      DemoQueueNameEnum.DEMO,
      DemoJobTypeEnum.FAIL,
      expect.objectContaining({
        message: "Simulated demo failure",
      }),
      expect.any(Object)
    );
  });

  it("clean/reset targets only the demo queue", async () => {
    const resetQueue = vi.fn(async (queueName: string) => {
      if (queueName !== DemoQueueNameEnum.DEMO) {
        throw new QueueToolkitError(
          `Queue "${queueName}" is not allowlisted`,
          ErrorCode.QUEUE_NOT_ALLOWLISTED
        );
      }
      return { queueName };
    });

    setQueueInfrastructure({
      enqueue: vi.fn(),
      listJobs: vi.fn(),
      getJob: vi.fn(),
      getMetrics: vi.fn(),
      resetQueue,
      getOrCreateQueue: vi.fn(),
      createWorker: vi.fn(),
      createConnection: vi.fn(),
      close: vi.fn(),
    } as never);

    await expect(resetDemoQueues()).resolves.toEqual({
      queues: [DemoQueueNameEnum.DEMO],
    });
    expect(resetQueue).toHaveBeenCalledWith(DemoQueueNameEnum.DEMO);
    expect(resetQueue).toHaveBeenCalledTimes(1);
  });
});
