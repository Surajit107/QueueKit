import { describe, expect, it, vi } from "vitest";
import { DemoEventEnum } from "@queuekit/shared";
import {
  demoEvents,
  isAllowlistedDemoEvent,
} from "@/services/demo-events.service.js";

describe("demo-events.service", () => {
  it("publishes only allowlisted event types", () => {
    const listener = vi.fn();
    const unsubscribe = demoEvents.subscribe(listener);

    demoEvents.publish(DemoEventEnum.JOB_COMPLETED, { jobId: "1" });
    demoEvents.publish("not.allowed" as never, { jobId: "2" });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[0]).toMatchObject({
      type: DemoEventEnum.JOB_COMPLETED,
      data: { jobId: "1" },
    });

    unsubscribe();
    expect(isAllowlistedDemoEvent(DemoEventEnum.JOB_FAILED)).toBe(true);
    expect(isAllowlistedDemoEvent("evil.event")).toBe(false);
  });

  it("unsubscribe stops delivery", () => {
    const listener = vi.fn();
    const unsubscribe = demoEvents.subscribe(listener);
    unsubscribe();
    demoEvents.publish(DemoEventEnum.JOB_WAITING, {});
    expect(listener).not.toHaveBeenCalled();
  });
});
