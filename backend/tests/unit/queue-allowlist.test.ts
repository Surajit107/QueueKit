import { describe, expect, it } from "vitest";
import {
  assertAllowlistedJobType,
  assertAllowlistedQueue,
  assertEnqueueOptionBounds,
  assertPayloadWithinBounds,
  QUEUE_BOUNDS,
  QueueToolkitError,
} from "@queuekit/queue-toolkit";
import {
  AvailableDemoJobTypes,
  AvailableDemoQueues,
  DemoJobTypeEnum,
  DemoQueueNameEnum,
  ErrorCode,
} from "@queuekit/shared";

describe("queue-toolkit allowlist", () => {
  it("allows predefined demo queue and job types", () => {
    expect(() =>
      assertAllowlistedQueue(DemoQueueNameEnum.DEMO, AvailableDemoQueues)
    ).not.toThrow();
    expect(() =>
      assertAllowlistedJobType(DemoJobTypeEnum.FAIL, AvailableDemoJobTypes)
    ).not.toThrow();
  });

  it("rejects unknown queue names", () => {
    expect(() =>
      assertAllowlistedQueue("evil-queue", AvailableDemoQueues)
    ).toThrow(QueueToolkitError);

    try {
      assertAllowlistedQueue("evil-queue", AvailableDemoQueues);
    } catch (error) {
      expect(error).toBeInstanceOf(QueueToolkitError);
      expect((error as QueueToolkitError).code).toBe(
        ErrorCode.QUEUE_NOT_ALLOWLISTED
      );
    }
  });

  it("rejects unknown job types", () => {
    try {
      assertAllowlistedJobType("send-email", AvailableDemoJobTypes);
    } catch (error) {
      expect(error).toBeInstanceOf(QueueToolkitError);
      expect((error as QueueToolkitError).code).toBe(
        ErrorCode.JOB_TYPE_NOT_ALLOWLISTED
      );
    }
  });

  it("enforces payload and option bounds", () => {
    expect(() => assertPayloadWithinBounds({ ok: true })).not.toThrow();
    expect(() =>
      assertPayloadWithinBounds({
        blob: "x".repeat(QUEUE_BOUNDS.MAX_PAYLOAD_BYTES),
      })
    ).toThrow(QueueToolkitError);

    expect(() =>
      assertEnqueueOptionBounds({ delayMs: QUEUE_BOUNDS.MAX_DELAY_MS })
    ).not.toThrow();
    expect(() =>
      assertEnqueueOptionBounds({ delayMs: QUEUE_BOUNDS.MAX_DELAY_MS + 1 })
    ).toThrow(QueueToolkitError);
    expect(() => assertEnqueueOptionBounds({ priority: 0 })).toThrow(
      QueueToolkitError
    );
  });
});
