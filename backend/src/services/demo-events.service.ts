import { EventEmitter } from "node:events";
import {
  AvailableDemoEvents,
  type DemoEvent,
} from "@queuekit/shared";

export type DemoEventPayload = {
  type: DemoEvent;
  at: string;
  data: Record<string, unknown>;
};

type DemoEventListener = (payload: DemoEventPayload) => void;

/**
 * In-process allowlisted demo event bus for SSE.
 * Not durable across processes — free-tier single-process assumption.
 */
class DemoEventBus {
  private readonly emitter = new EventEmitter();

  constructor() {
    // Avoid MaxListenersExceededWarning under many concurrent SSE clients.
    this.emitter.setMaxListeners(100);
  }

  publish(type: DemoEvent, data: Record<string, unknown> = {}): void {
    if (!AvailableDemoEvents.includes(type)) {
      return;
    }

    const payload: DemoEventPayload = {
      type,
      at: new Date().toISOString(),
      data,
    };
    this.emitter.emit("demo", payload);
  }

  subscribe(listener: DemoEventListener): () => void {
    this.emitter.on("demo", listener);
    return () => {
      this.emitter.off("demo", listener);
    };
  }

  /** Test helper */
  listenerCount(): number {
    return this.emitter.listenerCount("demo");
  }
}

export const demoEvents = new DemoEventBus();

export const isAllowlistedDemoEvent = (value: string): value is DemoEvent =>
  AvailableDemoEvents.includes(value as DemoEvent);
