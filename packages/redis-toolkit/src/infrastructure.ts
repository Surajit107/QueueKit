import { Redis } from "ioredis";
import { ErrorCode } from "@queuekit/shared";
import {
  createCacheAsideHelpers,
  type CacheAsideHelpers,
} from "./cache-aside.js";
import {
  createCounterHelpers,
  type CounterHelpers,
} from "./counters.js";
import { RedisToolkitError } from "./errors.js";
import { probeRedisHealth } from "./health.js";
import { createKeyHelpers, type KeyHelpers } from "./keys.js";
import { createNamespaceGuard, type NamespaceGuard } from "./namespace.js";
import {
  createRateLimitHelpers,
  type RateLimitHelpers,
} from "./rate-limit.js";
import {
  createPubSubHelpers,
  type PubSubHelpers,
} from "./pubsub.js";
import { createResetHelpers, type ResetHelpers } from "./reset.js";
import {
  createStructureHelpers,
  type StructureHelpers,
} from "./structures.js";
import { createTtlHelpers, type TtlHelpers } from "./ttl.js";
import type {
  RedisHealthResult,
  RedisInfrastructureOptions,
} from "./types.js";

/**
 * Single shared Redis connection + namespaced helpers.
 * Callers own config; this class owns lifecycle.
 * Pub/Sub subscribe always uses a dedicated duplicate() — never this command client.
 */
export class RedisInfrastructure {
  public readonly prefix: string;
  public readonly keys: KeyHelpers;
  public readonly ttl: TtlHelpers;
  public readonly structures: StructureHelpers;
  public readonly cache: CacheAsideHelpers;
  public readonly counters: CounterHelpers;
  public readonly rateLimit: RateLimitHelpers;
  public readonly pubsub: PubSubHelpers;
  public readonly reset: ResetHelpers;

  private readonly client: Redis;
  private readonly ns: NamespaceGuard;
  private readonly ownsClient: boolean;
  private readonly logger: RedisInfrastructureOptions["logger"];
  private connectAttempted = false;

  constructor(options: RedisInfrastructureOptions) {
    if (!options.url?.trim() && !options.client) {
      throw new RedisToolkitError(
        "Redis url is required when no client is injected",
        ErrorCode.VALIDATION_FAILED
      );
    }

    this.ns = createNamespaceGuard(options.keyPrefix);
    this.prefix = this.ns.prefix;
    this.logger = options.logger;
    this.ownsClient = !options.client;

    this.client =
      options.client ??
      new Redis(options.url.trim(), {
        maxRetriesPerRequest: 2,
        enableReadyCheck: true,
        lazyConnect: true,
        connectTimeout: 10_000,
        retryStrategy: (times) => {
          if (times > 5) return null;
          return Math.min(times * 200, 2000);
        },
        ...options.redisOptions,
      });

    if (options.onError) {
      this.client.on("error", options.onError);
    } else {
      this.client.on("error", (err) => {
        this.logger?.error?.(`Redis error: ${err.message}`, err);
      });
    }

    this.keys = createKeyHelpers(this.client, this.ns);
    this.ttl = createTtlHelpers(this.client, this.ns);
    this.structures = createStructureHelpers(this.client, this.ns);
    this.cache = createCacheAsideHelpers(this.client, this.ns);
    this.counters = createCounterHelpers(this.client, this.ns);
    this.rateLimit = createRateLimitHelpers(this.client, this.ns);
    this.pubsub = createPubSubHelpers(this.client, this.ns, this.logger);
    this.reset = createResetHelpers(this.client, this.ns);
  }

  getClient(): Redis {
    return this.client;
  }

  isReady(): boolean {
    return this.client.status === "ready";
  }

  wasConnectAttempted(): boolean {
    return this.connectAttempted;
  }

  async connect(): Promise<Redis> {
    if (this.client.status === "ready") {
      return this.client;
    }

    this.connectAttempted = true;

    try {
      if (this.client.status === "wait") {
        await this.client.connect();
      }
      await this.client.ping();
      this.logger?.info?.("Redis connected");
      return this.client;
    } catch (error) {
      this.logger?.error?.("Redis connection error", error);
      throw new RedisToolkitError(
        "Failed to connect to Redis",
        ErrorCode.DEPENDENCY_UNAVAILABLE,
        503
      );
    }
  }

  async disconnect(): Promise<void> {
    if (!this.ownsClient) {
      return;
    }

    try {
      if (this.client.status === "ready" || this.client.status === "connecting") {
        await this.client.quit();
      } else {
        this.client.disconnect();
      }
    } catch {
      try {
        this.client.disconnect();
      } catch {
        /* ignore */
      }
    }
  }

  async health(): Promise<RedisHealthResult> {
    return probeRedisHealth(this.client);
  }

  toFullKey(suffix: string): string {
    return this.ns.toFullKey(suffix);
  }
}

export const createRedisInfrastructure = (
  options: RedisInfrastructureOptions
): RedisInfrastructure => new RedisInfrastructure(options);
