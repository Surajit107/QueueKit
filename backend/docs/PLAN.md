# QueueKit API — Implementation & Unit Test Plan

> App: `backend` (`QUEUEKIT_API`)  
> Related: `@queuekit/redis-toolkit`, `@queuekit/queue-toolkit`, `@queuekit/shared`, worker process  
> Source of truth: [QUEUEKIT_PRODUCT_SPEC.md](../../QUEUEKIT_PRODUCT_SPEC.md)

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Runtime | Node.js |
| Language | TypeScript (strict) |
| HTTP framework | Express |
| Validation | Zod |
| Redis client | `ioredis` (via `@queuekit/redis-toolkit`) |
| Queue library | BullMQ (via `@queuekit/queue-toolkit`) |
| Shared contracts | `@queuekit/shared` |
| API docs | OpenAPI 3 + Scalar (or lightweight generated reference) |
| Unit / API tests | Vitest + Supertest |
| Integration tests | Vitest against real Redis (Docker) |
| Logging | Structured logger (no secrets / full sensitive payloads) |
| Config | Environment variables; validated at startup |
| Package manager | npm workspaces (monorepo root) |
| Local Redis | Docker Compose (`docker compose up -d`) or any `REDIS_URL` |
| Hosting | Railway web service (API + worker in one process on free tier) |
| Datastore (hosted) | Railway Redis / Key Value / any Redis-compatible store |

**Out of scope for this app:** Next.js UI, Cloudflare Pages, browser-only libraries.  
**Monorepo note:** `@queuekit/*` packages live in `/packages` and must be built from the repo root so Railway installs resolve them.

---

## Implementation plan

Complete top to bottom. Do not skip scaffolding or toolkit foundations to jump to routes.

### Phase 1 — Scaffold

- [x] Initialize standalone `backend` app (npm)
- [x] Enable TypeScript strict mode
- [x] Add Express entrypoint (`src/app.ts` / `src/index.ts`) — PRAXIS-shaped layout
- [x] Add env validation at startup (fail fast on missing required vars)
- [x] Add structured logging setup
- [x] Wire `dev`, `build`, `lint`, `typecheck`, `test` scripts
- [x] Confirm app builds and boots locally against Redis (`REDIS_URL`)

### Phase 2 — Shared foundations

- [x] Consume `@queuekit/shared` types, error contracts, and constants
- [x] Define demo namespace (`queuekit:demo:`) as a constant, not magic strings
- [x] Add CORS allowlisting for the frontend origin
- [x] Add request body size limits
- [x] Add global error handler with sanitized responses
- [x] Add `GET /health` (liveness only)

### Phase 3 — Redis toolkit integration

- [x] Inject Redis client from `@queuekit/redis-toolkit` (single shared connection)
- [x] Implement Redis health check used by status endpoint
- [x] Implement allowlisted demo key helpers (set / get / delete / list)
- [x] Implement TTL helpers with server-confirmed remaining TTL
- [x] Implement bounded data-structure demo operations
- [x] Implement cache-aside demo service (controlled mock source)
- [x] Implement counter (INCR / DECR) demo service
- [x] Implement fixed- or sliding-window rate-limit demo service
- [x] Optional: Pub/Sub demo with explicit durability limitations
- [x] Implement namespaced demo reset (Redis keys only)

### Phase 4 — Queue toolkit integration

- [x] Inject queue factory from `@queuekit/queue-toolkit`
- [x] Allow only predefined demo queue names and job types
- [x] Implement enqueue with Zod-validated payloads
- [x] Implement job list / detail / metrics services
- [x] Wire retry, delay, priority, and failure-simulation job options
- [x] Expose worker health reporting (last heartbeat / active state)
- [x] Enforce bounded job retention for completed / failed jobs
- [x] Ensure graceful shutdown closes Redis + BullMQ connections

### Phase 5 — HTTP API (`/api/v1`)

- [x] `GET /api/v1/status` — API, Redis, worker status (honest unknown/offline)
- [x] `GET|POST|DELETE /api/v1/redis/demo/keys` (+ `:key`)
- [x] `POST /api/v1/redis/demo/cache`
- [x] `POST /api/v1/redis/demo/rate-limit`
- [x] `POST /api/v1/redis/demo/counter`
- [x] `POST /api/v1/redis/demo/structures`
- [x] `GET /api/v1/redis/demo/pubsub/channels`
- [x] `POST /api/v1/redis/demo/pubsub/publish`
- [x] `GET /api/v1/redis/demo/pubsub/events` (SSE; dedicated Redis subscriber)
- [x] `POST /api/v1/queues/:queue/jobs`
- [x] `GET /api/v1/queues/:queue/jobs`
- [x] `GET /api/v1/queues/:queue/jobs/:jobId`
- [x] `GET /api/v1/queues/:queue/metrics`
- [x] `GET /api/v1/events` — SSE for allowlisted demo events (+ polling notes)
- [x] `POST /api/v1/demo/reset` — namespaced resources only, confirmation required

### Phase 6 — Safety & hardening

- [x] Per-IP / per-session rate limits on public routes
- [x] Conservative job submission limits
- [x] Reject arbitrary Redis commands / generic forwarders
- [x] Sanitize errors (no secrets, connection URLs, raw stack traces)
- [x] Destructive ops require explicit confirmation and target demo resources only
- [x] OpenAPI reference for public contracts
- [x] Document free-tier cold start / ephemeral data behavior in API docs

---

## Unit testing checklist

Order is foundation → middleware → services → routes. Mark each item when covered by Vitest (mock Redis/BullMQ for pure unit tests; use Docker Redis for integration where noted).

### A. Config & bootstrap

- [x] Env schema accepts valid config
- [x] Env schema rejects missing / invalid required variables
- [x] App boots with validated config
- [x] App refuses to start when Redis URL is missing (or equivalent required var)

### B. Error & response contracts

- [x] Error mapper returns safe public messages
- [x] Error mapper never leaks secrets or connection strings
- [x] Unknown errors map to generic 500 without stack traces in responses
- [x] Validation failures return 400 with field-level Zod issues (sanitized)

### C. Middleware

- [x] CORS allows configured frontend origin
- [x] CORS rejects disallowed origins
- [x] Body size over limit is rejected
- [x] Rate limiter blocks after threshold
- [x] Rate limiter allows traffic under threshold

### D. Demo namespace & allowlists

- [x] Key helpers always prefix `queuekit:demo:`
- [x] Keys outside namespace are rejected
- [x] Unknown queue names are rejected
- [x] Unknown job types are rejected
- [x] Payload size / shape caps are enforced

### E. Redis services (unit — mocked client)

- [x] Set / get / delete demo key
- [x] List returns only allowlisted namespaced keys
- [x] TTL set + remaining TTL read
- [x] String / hash / list / set / zset demo ops stay within bounds
- [x] Cache-aside: miss path fetches mock source and writes cache
- [x] Cache-aside: hit path skips mock source
- [x] Cache metrics counters increment correctly
- [x] Counter INCR / DECR behavior
- [x] Rate-limit allows under quota and denies over quota
- [x] Reset deletes only namespaced demo keys

### F. Queue services (unit — mocked BullMQ)

- [x] Enqueue creates job with validated payload
- [x] Enqueue rejects invalid payload
- [x] Job detail maps waiting / active / delayed / completed / failed
- [x] Retry / backoff options are applied for demo job types
- [x] Delayed job schedules with expected delay
- [x] Priority values are passed through correctly
- [x] Failure-simulation job type is allowlisted and harmless
- [x] Metrics aggregate counts when data is available
- [x] Retention policy trims completed / failed jobs
- [x] Pause / resume / clean target only the demo queue

### G. Status & health

- [x] `/health` returns ok when process is up
- [x] `/api/v1/status` reports Redis connected / disconnected honestly
- [x] `/api/v1/status` reports worker active / unknown / offline honestly
- [x] Status never fabricates healthy values on failure

### H. Route handlers (Supertest + mocks)

- [x] `GET /health`
- [x] `GET /api/v1/status`
- [x] `GET /api/v1/redis/demo/keys`
- [x] `POST /api/v1/redis/demo/keys` (valid + invalid body)
- [x] `GET /api/v1/redis/demo/keys/:key` (found + not found)
- [x] `DELETE /api/v1/redis/demo/keys/:key`
- [x] `POST /api/v1/redis/demo/cache`
- [x] `POST /api/v1/redis/demo/rate-limit`
- [x] `POST /api/v1/redis/demo/counter`
- [x] `POST /api/v1/redis/demo/structures`
- [ ] `GET /api/v1/redis/demo/pubsub/channels`
- [ ] `POST /api/v1/redis/demo/pubsub/publish` (allowlisted + reject unknown channel)
- [ ] `GET /api/v1/redis/demo/pubsub/events` (SSE cleanup + dedicated subscriber)
- [x] `POST /api/v1/queues/:queue/jobs` (allowlisted + rejected)
- [x] `GET /api/v1/queues/:queue/jobs`
- [x] `GET /api/v1/queues/:queue/jobs/:jobId`
- [x] `GET /api/v1/queues/:queue/metrics`
- [x] `POST /api/v1/demo/reset` (with + without confirmation)

### I. SSE / events

- [x] SSE endpoint streams only allowlisted event types
- [x] Unauthorized / invalid event subscriptions are rejected
- [x] Connection cleanup runs on client disconnect

### J. Lifecycle

- [x] Graceful shutdown closes Redis connection
- [x] Graceful shutdown closes BullMQ producers / workers owned by the process
- [x] No new jobs accepted after shutdown begins

### K. Integration (Docker Redis — required before calling unit suite “done”)

- [ ] Real Redis: key CRUD + TTL
- [ ] Real Redis: cache-aside hit / miss
- [ ] Real Redis: rate-limit window behavior
- [ ] Real BullMQ: enqueue → process → complete (with worker)
- [ ] Real BullMQ: retry on controlled failure
- [ ] Real BullMQ: delayed job becomes active after delay
- [ ] Demo reset clears only namespaced resources

---

## Exit criteria

- [x] All Phase 1–6 implementation items checked
- [x] Unit checklist A–J green under Vitest
- [ ] Integration checklist K green against Docker Redis
- [x] No unrestricted Redis command endpoint exists
- [x] Public demo remains safe to hammer (limits + namespace + sanitization)

---

*Update this file as phases complete. Keep checkboxes honest — unchecked means not done.*
