import { vi } from 'vitest'

type Listener = (event: Event) => void

/**
 * Controllable EventSource stand-in for SSE hook tests.
 */
export class MockEventSource {
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSED = 2

  static instances: MockEventSource[] = []

  readonly url: string
  readyState = MockEventSource.CONNECTING
  onerror: ((this: EventSource, ev: Event) => unknown) | null = null
  onopen: ((this: EventSource, ev: Event) => unknown) | null = null
  onmessage: ((this: EventSource, ev: MessageEvent) => unknown) | null = null

  private readonly listeners = new Map<string, Set<Listener>>()

  constructor(url: string | URL) {
    this.url = String(url)
    MockEventSource.instances.push(this)
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    const fn = typeof listener === 'function' ? listener : listener.handleEvent.bind(listener)
    const set = this.listeners.get(type) ?? new Set()
    set.add(fn as Listener)
    this.listeners.set(type, set)
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    const fn = typeof listener === 'function' ? listener : listener.handleEvent.bind(listener)
    this.listeners.get(type)?.delete(fn as Listener)
  }

  close(): void {
    this.readyState = MockEventSource.CLOSED
  }

  open(): void {
    this.readyState = MockEventSource.OPEN
    this.dispatch('connected', new Event('connected'))
  }

  failClosed(): void {
    this.readyState = MockEventSource.CLOSED
    const handler = this.onerror
    if (handler) {
      handler.call(this as unknown as EventSource, new Event('error'))
    }
  }

  emit(type: string, data: unknown): void {
    const event = new MessageEvent(type, { data: JSON.stringify(data) })
    this.dispatch(type, event)
  }

  private dispatch(type: string, event: Event): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event)
    }
  }

  static reset(): void {
    MockEventSource.instances = []
  }

  static install(): void {
    MockEventSource.reset()
    vi.stubGlobal('EventSource', MockEventSource)
  }
}
