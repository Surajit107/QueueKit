import type { Redis } from "ioredis";
import type { NamespaceGuard } from "./namespace.js";

export const createCounterHelpers = (client: Redis, ns: NamespaceGuard) => {
  const incr = async (
    suffix: string,
    by = 1
  ): Promise<{ key: string; value: number }> => {
    const fullKey = ns.toFullKey(suffix);
    const value =
      by === 1 ? await client.incr(fullKey) : await client.incrby(fullKey, by);
    return { key: suffix, value };
  };

  const decr = async (
    suffix: string,
    by = 1
  ): Promise<{ key: string; value: number }> => {
    const fullKey = ns.toFullKey(suffix);
    const value =
      by === 1 ? await client.decr(fullKey) : await client.decrby(fullKey, by);
    return { key: suffix, value };
  };

  const get = async (
    suffix: string
  ): Promise<{ key: string; value: number }> => {
    const fullKey = ns.toFullKey(suffix);
    const raw = await client.get(fullKey);
    return { key: suffix, value: raw === null ? 0 : Number(raw) || 0 };
  };

  return { incr, decr, get };
};

export type CounterHelpers = ReturnType<typeof createCounterHelpers>;
