import type { Redis, RedisOptions } from "ioredis";
import type { DependencyStatus } from "@queuekit/shared";

export type RedisLogger = {
  info?: (message: string) => void;
  error?: (message: string, error?: unknown) => void;
};

export type RedisInfrastructureOptions = {
  url: string;
  keyPrefix: string;
  /** Inject an existing client (tests / multi-connection setups). */
  client?: Redis;
  redisOptions?: RedisOptions;
  logger?: RedisLogger;
  onError?: (error: Error) => void;
};

export type RedisHealthResult = {
  status: DependencyStatus;
  latencyMs: number | null;
};

export type DemoKeyRecord = {
  key: string;
  value: string;
  ttlSeconds: number | null;
};

export type CacheAsideResult<T> = {
  hit: boolean;
  value: T;
  latencyMs: number;
  ttlSeconds: number | null;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  windowMs: number;
  retryAfterMs: number | null;
};

export type StructureKind = "string" | "hash" | "list" | "set" | "zset";

export type NamespaceResetResult = {
  deleted: number;
  prefix: string;
};
