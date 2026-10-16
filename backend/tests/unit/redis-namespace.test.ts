import { createNamespaceGuard, RedisToolkitError } from "@queuekit/redis-toolkit";
import { DEMO_REDIS_NAMESPACE, ErrorCode } from "@queuekit/shared";

describe("redis namespace guard", () => {
  const ns = createNamespaceGuard(DEMO_REDIS_NAMESPACE);

  it("prefixes relative suffixes", () => {
    expect(ns.toFullKey("hello")).toBe("queuekit:demo:hello");
  });

  it("rejects keys outside namespace", () => {
    expect(() => ns.assertOwned("other:hello")).toThrow(RedisToolkitError);
    try {
      ns.assertOwned("other:hello");
    } catch (error) {
      expect(error).toBeInstanceOf(RedisToolkitError);
      expect((error as RedisToolkitError).code).toBe(
        ErrorCode.NAMESPACE_VIOLATION
      );
    }
  });

  it("rejects invalid / wildcard suffixes", () => {
    expect(() => ns.toFullKey("foo*")).toThrow(/letters, numbers/);
  });
});
