import type { Redis } from "ioredis";
import { ErrorCode } from "@queuekit/shared";
import { REDIS_BOUNDS } from "./bounds.js";
import { RedisToolkitError } from "./errors.js";
import type { NamespaceGuard } from "./namespace.js";

export const createStructureHelpers = (client: Redis, ns: NamespaceGuard) => {
  const hashSet = async (
    suffix: string,
    field: string,
    value: string
  ): Promise<{ key: string; field: string; fields: number }> => {
    const fullKey = ns.toFullKey(suffix);
    const existing = await client.hlen(fullKey);
    const hasField = await client.hexists(fullKey, field);
    if (existing >= REDIS_BOUNDS.MAX_HASH_FIELDS && hasField === 0) {
      throw new RedisToolkitError(
        `Hash may contain at most ${REDIS_BOUNDS.MAX_HASH_FIELDS} fields`,
        ErrorCode.VALIDATION_FAILED
      );
    }
    await client.hset(fullKey, field, value);
    const fields = await client.hlen(fullKey);
    return { key: suffix, field, fields };
  };

  const hashGetAll = async (
    suffix: string
  ): Promise<{ key: string; fields: Record<string, string> }> => {
    const fullKey = ns.toFullKey(suffix);
    const fields = await client.hgetall(fullKey);
    return { key: suffix, fields };
  };

  const listPush = async (
    suffix: string,
    value: string
  ): Promise<{ key: string; length: number }> => {
    const fullKey = ns.toFullKey(suffix);
    const length = await client.llen(fullKey);
    if (length >= REDIS_BOUNDS.MAX_LIST_LENGTH) {
      throw new RedisToolkitError(
        `List may contain at most ${REDIS_BOUNDS.MAX_LIST_LENGTH} items`,
        ErrorCode.VALIDATION_FAILED
      );
    }
    const next = await client.rpush(fullKey, value);
    return { key: suffix, length: next };
  };

  const listRange = async (
    suffix: string
  ): Promise<{ key: string; items: string[] }> => {
    const fullKey = ns.toFullKey(suffix);
    const items = await client.lrange(fullKey, 0, REDIS_BOUNDS.MAX_LIST_LENGTH - 1);
    return { key: suffix, items };
  };

  const setAdd = async (
    suffix: string,
    member: string
  ): Promise<{ key: string; added: boolean; size: number }> => {
    const fullKey = ns.toFullKey(suffix);
    const size = await client.scard(fullKey);
    const isMember = await client.sismember(fullKey, member);
    if (size >= REDIS_BOUNDS.MAX_SET_MEMBERS && isMember === 0) {
      throw new RedisToolkitError(
        `Set may contain at most ${REDIS_BOUNDS.MAX_SET_MEMBERS} members`,
        ErrorCode.VALIDATION_FAILED
      );
    }
    const added = await client.sadd(fullKey, member);
    const nextSize = await client.scard(fullKey);
    return { key: suffix, added: added > 0, size: nextSize };
  };

  const setMembers = async (
    suffix: string
  ): Promise<{ key: string; members: string[] }> => {
    const fullKey = ns.toFullKey(suffix);
    const members = await client.smembers(fullKey);
    return { key: suffix, members: members.slice(0, REDIS_BOUNDS.MAX_SET_MEMBERS) };
  };

  const zAdd = async (
    suffix: string,
    score: number,
    member: string
  ): Promise<{ key: string; size: number }> => {
    const fullKey = ns.toFullKey(suffix);
    const size = await client.zcard(fullKey);
    const rank = await client.zrank(fullKey, member);
    if (size >= REDIS_BOUNDS.MAX_ZSET_MEMBERS && rank === null) {
      throw new RedisToolkitError(
        `Sorted set may contain at most ${REDIS_BOUNDS.MAX_ZSET_MEMBERS} members`,
        ErrorCode.VALIDATION_FAILED
      );
    }
    await client.zadd(fullKey, score, member);
    const nextSize = await client.zcard(fullKey);
    return { key: suffix, size: nextSize };
  };

  const zRangeWithScores = async (
    suffix: string
  ): Promise<{ key: string; members: Array<{ member: string; score: number }> }> => {
    const fullKey = ns.toFullKey(suffix);
    const raw = await client.zrange(
      fullKey,
      0,
      REDIS_BOUNDS.MAX_ZSET_MEMBERS - 1,
      "WITHSCORES"
    );
    const members: Array<{ member: string; score: number }> = [];
    for (let i = 0; i < raw.length; i += 2) {
      const member = raw[i];
      const scoreRaw = raw[i + 1];
      if (member === undefined || scoreRaw === undefined) continue;
      members.push({ member, score: Number(scoreRaw) });
    }
    return { key: suffix, members };
  };

  return {
    hashSet,
    hashGetAll,
    listPush,
    listRange,
    setAdd,
    setMembers,
    zAdd,
    zRangeWithScores,
  };
};

export type StructureHelpers = ReturnType<typeof createStructureHelpers>;
