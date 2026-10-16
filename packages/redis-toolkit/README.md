# `@queuekit/redis-toolkit`

Single shared Redis connection with namespaced helpers for QueueKit demos and reusable apps.

## Features

- Connection lifecycle (`connect` / `disconnect` / `health`)
- Allowlisted key CRUD under a required prefix (default `queuekit:demo:`)
- Server-confirmed TTL helpers
- Bounded hash / list / set / zset operations
- Cache-aside with caller-owned loader
- Atomic counters (`INCR` / `DECR`)
- Sliding-window rate limiter
- Namespace-only reset (`SCAN` + `DEL`)

## Usage

```ts
import { createRedisInfrastructure } from "@queuekit/redis-toolkit";
import { DEMO_REDIS_NAMESPACE } from "@queuekit/shared";

const redis = createRedisInfrastructure({
  url: process.env.REDIS_URL!,
  keyPrefix: DEMO_REDIS_NAMESPACE,
});

await redis.connect();
await redis.keys.setString("hello", "world", 60);
await redis.disconnect();
```

## Build

From the **monorepo root** (preferred):

```bash
npm install
npm run build:packages
```

Or:

```bash
npm run build -w @queuekit/redis-toolkit
```
