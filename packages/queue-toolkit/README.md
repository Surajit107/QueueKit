# `@queuekit/queue-toolkit`

BullMQ queue factory, worker helpers, bounded retention, and job inspection for QueueKit.

## Features

- Queue creation with injectable Redis connection
- Optional allowlists for queue names and job types
- Enqueue with delay / priority / retry options
- Job list, detail, and metrics helpers
- Bounded `removeOnComplete` / `removeOnFail` retention
- Worker factory + Redis heartbeat helpers
- Graceful `close()` for queues, workers, and owned connections

## Usage

```ts
import { createQueueInfrastructure } from "@queuekit/queue-toolkit";
import { AvailableDemoQueues, AvailableDemoJobTypes } from "@queuekit/shared";

const queues = createQueueInfrastructure({
  url: process.env.REDIS_URL!,
  allowedQueues: AvailableDemoQueues,
  allowedJobTypes: AvailableDemoJobTypes,
});

await queues.enqueue("queuekit-demo", "echo", { message: "hello" });

const worker = queues.createWorker("queuekit-demo", async (job) => {
  return { echoed: job.data };
});

await queues.close();
```

## Build

From the **monorepo root** (preferred):

```bash
npm install
npm run build:packages
```

Or:

```bash
npm run build -w @queuekit/queue-toolkit
```
