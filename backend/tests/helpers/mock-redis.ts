import type { Redis } from "ioredis";
import { vi } from "vitest";

type StringEntry = { value: string; expiresAt: number | null };

/**
 * In-memory ioredis stand-in for toolkit unit tests.
 * Covers keys, TTL, structures, counters, scan/del, and rate-limit zset ops.
 */
export const createMockRedisClient = () => {
  const strings = new Map<string, StringEntry>();
  const hashes = new Map<string, Map<string, string>>();
  const lists = new Map<string, string[]>();
  const sets = new Map<string, Set<string>>();
  const zsets = new Map<string, Map<string, number>>();

  const allKeys = (): string[] =>
    [
      ...new Set([
        ...strings.keys(),
        ...hashes.keys(),
        ...lists.keys(),
        ...sets.keys(),
        ...zsets.keys(),
      ]),
    ];

  const client = {
    status: "ready" as string,
    get: vi.fn(async (key: string) => strings.get(key)?.value ?? null),
    set: vi.fn(
      async (key: string, value: string, mode?: string, ttl?: number) => {
        const expiresAt =
          mode === "EX" && typeof ttl === "number"
            ? Date.now() + ttl * 1000
            : null;
        strings.set(key, { value, expiresAt });
        return "OK";
      }
    ),
    del: vi.fn(async (...keys: string[]) => {
      let count = 0;
      for (const key of keys) {
        if (strings.delete(key)) count += 1;
        if (hashes.delete(key)) count += 1;
        if (lists.delete(key)) count += 1;
        if (sets.delete(key)) count += 1;
        if (zsets.delete(key)) count += 1;
      }
      return count;
    }),
    ttl: vi.fn(async (key: string) => {
      const entry = strings.get(key);
      if (!entry) return -2;
      if (entry.expiresAt === null) return -1;
      return Math.max(0, Math.ceil((entry.expiresAt - Date.now()) / 1000));
    }),
    incr: vi.fn(async (key: string) => {
      const next = Number(strings.get(key)?.value ?? 0) + 1;
      strings.set(key, { value: String(next), expiresAt: null });
      return next;
    }),
    incrby: vi.fn(async (key: string, by: number) => {
      const next = Number(strings.get(key)?.value ?? 0) + by;
      strings.set(key, { value: String(next), expiresAt: null });
      return next;
    }),
    decr: vi.fn(async (key: string) => {
      const next = Number(strings.get(key)?.value ?? 0) - 1;
      strings.set(key, { value: String(next), expiresAt: null });
      return next;
    }),
    decrby: vi.fn(async (key: string, by: number) => {
      const next = Number(strings.get(key)?.value ?? 0) - by;
      strings.set(key, { value: String(next), expiresAt: null });
      return next;
    }),
    hlen: vi.fn(async (key: string) => hashes.get(key)?.size ?? 0),
    hexists: vi.fn(async (key: string, field: string) =>
      hashes.get(key)?.has(field) ? 1 : 0
    ),
    hset: vi.fn(async (key: string, field: string, value: string) => {
      const map = hashes.get(key) ?? new Map();
      map.set(field, value);
      hashes.set(key, map);
      return 1;
    }),
    hgetall: vi.fn(async (key: string) => {
      const map = hashes.get(key);
      if (!map) return {};
      return Object.fromEntries(map.entries());
    }),
    llen: vi.fn(async (key: string) => lists.get(key)?.length ?? 0),
    rpush: vi.fn(async (key: string, value: string) => {
      const list = lists.get(key) ?? [];
      list.push(value);
      lists.set(key, list);
      return list.length;
    }),
    lrange: vi.fn(async (key: string, start: number, end: number) => {
      const list = lists.get(key) ?? [];
      const sliceEnd = end < 0 ? undefined : end + 1;
      return list.slice(start, sliceEnd);
    }),
    scard: vi.fn(async (key: string) => sets.get(key)?.size ?? 0),
    sismember: vi.fn(async (key: string, member: string) =>
      sets.get(key)?.has(member) ? 1 : 0
    ),
    sadd: vi.fn(async (key: string, member: string) => {
      const set = sets.get(key) ?? new Set();
      const before = set.size;
      set.add(member);
      sets.set(key, set);
      return set.size > before ? 1 : 0;
    }),
    smembers: vi.fn(async (key: string) => [...(sets.get(key) ?? [])]),
    zcard: vi.fn(async (key: string) => zsets.get(key)?.size ?? 0),
    zrank: vi.fn(async (key: string, member: string) => {
      const set = zsets.get(key);
      if (!set?.has(member)) return null;
      const sorted = [...set.entries()].sort((a, b) => a[1] - b[1]);
      return sorted.findIndex(([m]) => m === member);
    }),
    zadd: vi.fn(async (key: string, score: number, member: string) => {
      const set = zsets.get(key) ?? new Map();
      set.set(member, score);
      zsets.set(key, set);
      return 1;
    }),
    zrange: vi.fn(
      async (key: string, _start: number, _end: number, withScores?: string) => {
        const set = zsets.get(key) ?? new Map();
        const sorted = [...set.entries()].sort((a, b) => a[1] - b[1]);
        if (withScores === "WITHSCORES") {
          return sorted.flatMap(([member, score]) => [member, String(score)]);
        }
        return sorted.map(([member]) => member);
      }
    ),
    // scan(cursor, 'MATCH', pattern, 'COUNT', count)
    scan: vi.fn(
      async (
        _cursor: string,
        matchKeyword?: string,
        pattern?: string
      ) => {
        const rawPattern =
          matchKeyword === "MATCH" && typeof pattern === "string"
            ? pattern
            : "*";
        const prefix = rawPattern.endsWith("*")
          ? rawPattern.slice(0, -1)
          : rawPattern;
        const filtered =
          rawPattern === "*"
            ? allKeys()
            : allKeys().filter((key) => key.startsWith(prefix));
        return ["0", filtered] as [string, string[]];
      }
    ),
    multi: vi.fn(() => {
      const ops: Array<() => unknown> = [];
      const pipeline = {
        zremrangebyscore: (key: string, _min: number, max: number) => {
          ops.push(() => {
            const set = zsets.get(key) ?? new Map();
            for (const [member, score] of set) {
              if (score <= max) set.delete(member);
            }
            zsets.set(key, set);
            return 1;
          });
          return pipeline;
        },
        zadd: (key: string, score: number, member: string) => {
          ops.push(() => {
            const set = zsets.get(key) ?? new Map();
            set.set(member, score);
            zsets.set(key, set);
            return 1;
          });
          return pipeline;
        },
        zcard: (key: string) => {
          ops.push(() => zsets.get(key)?.size ?? 0);
          return pipeline;
        },
        pexpire: () => {
          ops.push(() => 1);
          return pipeline;
        },
        exec: async () => ops.map((op) => [null, op()]),
      };
      return pipeline;
    }),
    zrem: vi.fn(async (key: string, member: string) => {
      const set = zsets.get(key);
      if (!set?.has(member)) return 0;
      set.delete(member);
      return 1;
    }),
    ping: vi.fn(async () => "PONG"),
    quit: vi.fn(async () => {
      client.status = "end";
      return "OK";
    }),
    disconnect: vi.fn(() => {
      client.status = "end";
    }),
    on: vi.fn(),
    connect: vi.fn(async () => undefined),
  };

  return {
    client: client as unknown as Redis,
    strings,
    hashes,
    lists,
    sets,
    zsets,
  };
};
