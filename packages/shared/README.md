# `@queuekit/shared`

Shared TypeScript types, error contracts, response envelopes, and safe constants for QueueKit packages and the API.

## Usage

```ts
import {
  DEMO_REDIS_NAMESPACE,
  ApiError,
  ApiResponse,
  ErrorCode,
} from "@queuekit/shared";
```

## Build

From the **monorepo root** (preferred):

```bash
npm install                 # postinstall builds packages
npm run build:packages
```

Or:

```bash
npm run build -w @queuekit/shared
```
