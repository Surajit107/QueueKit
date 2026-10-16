# QueueKit — Product & Design Spec

| | |
| --- | --- |
| **Status** | Initial product specification (living reference — update when decisions change) |
| **Product** | Free Redis + BullMQ learning playground and reusable infrastructure toolkit |
| **Brand** | **QueueKit** · Parent: [AsterIQ](https://asteriq.in) |
| **Promise** | Learn Redis and BullMQ through real, interactive demonstrations — then reuse the infrastructure in future Node.js applications. |
| **Hosting target** | **₹0/month** using free-tier services, subject to provider limits and availability |

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [Product definition](#2-product-definition)
3. [Brand, voice & copy](#3-brand-voice--copy)
4. [Information architecture](#4-information-architecture)
5. [Feature set](#5-feature-set)
6. [Visual design system](#6-visual-design-system)
7. [Technical architecture](#7-technical-architecture)
8. [Reusable toolkit strategy](#8-reusable-toolkit-strategy)
9. [Repository structure](#9-repository-structure)
10. [API surface](#10-api-surface)
11. [Hosting & operations](#11-hosting--operations)
12. [Implementation plan](#12-implementation-plan)
13. [Quality checklist](#13-quality-checklist)

---

## 1. Executive summary

**QueueKit** is a free Redis and BullMQ playground backed by a reusable TypeScript toolkit. It combines a Next.js static frontend on Cloudflare Pages with an Express API and demo worker on Railway, targeting a ₹0/month deployment.

The repository is an npm workspaces monorepo so Redis connection management, caching helpers, queue creation, job contracts, and worker lifecycle can be reused independently in future applications.

The hosted demo is intentionally non-production: free-tier sleep, service limits, and ephemeral data must be handled explicitly. The core success criterion is not the dashboard alone — it is a tested, documented toolkit that can be integrated into another Node.js application with minimal changes.

---

## 2. Product definition

### 2.1 Decisions

| Decision | Choice |
| --- | --- |
| Product type | Interactive developer playground + documentation + reusable toolkit |
| Pricing / access | Free public demonstration; no account required for read-only learning surfaces |
| Audience | Backend developers, Node.js engineers, learners, indie builders, interview preparation |
| Backend | `QUEUEKIT_API` — Node.js + TypeScript + Express |
| Frontend | Next.js + TypeScript, statically exported for Cloudflare Pages |
| Redis client | `ioredis` |
| Queue system | BullMQ |
| Data store | Redis-compatible managed Key Value service in production; Redis container locally |
| UI | Tailwind CSS + shadcn/ui + Lucide |
| Live updates | Server-Sent Events (SSE), with polling fallback where appropriate |
| Deployment | Cloudflare Pages (frontend) + Railway web service (API/demo worker) + Railway Redis / compatible store |
| Repository | GitHub monorepo using npm workspaces |
| Core principle | Reusable infrastructure packages must be independent of the demo UI and business-specific job handlers |

**Free-tier qualification:** The target is ₹0/month, not a guarantee of unlimited or durable hosting. Provider quotas, plan eligibility, service availability, cold starts, and free-tier policies can change. The hosted demo is non-production and must tolerate service sleep, restarts, and data loss.

### 2.2 Explicit non-goals

- Production-grade durable job processing on free infrastructure.
- Storing sensitive or real customer data.
- Exposing unrestricted Redis commands or arbitrary queue administration publicly.
- Building a general-purpose Redis GUI that exposes the whole server.
- Adding authentication, billing, teams, or paid plans to the initial demo.
- Coupling reusable packages to Next.js, Express route handlers, or the presentation layer.
- Claiming Redis persistence or job durability when the selected free service does not provide it.

---

## 3. Brand, voice & copy

### 3.1 Brand direction

| Attribute | Value |
| --- | --- |
| Product name | QueueKit |
| Descriptor | Redis + BullMQ Playground |
| Parent attribution | Built by AsterIQ |
| Voice | Technical, precise, practical, and transparent about what is simulated versus executed against the live service |
| Visual direction | Cool ink dark canvas, signal-red accent, restrained glass panels, subtle hexagonal/honeycomb atmosphere |
| Design goal | A polished developer console, not a generic admin template |

### 3.2 Product copy

| Element | Copy |
| --- | --- |
| Primary promise | Explore Redis, understand background jobs, and reuse production-shaped Node.js infrastructure. |
| Primary CTAs | Open Redis Lab · Explore Queue Studio · Read the Docs |
| GitHub CTA | View Source |
| Hosted-demo disclaimer | Free learning environment. Data may reset, services may sleep, and job processing is not guaranteed to be durable. |

Avoid claims such as "production-ready infrastructure" until the toolkit has been tested and its reliability guarantees are clearly defined.

---

## 4. Information architecture

```text
QUEUEKIT
├── /                     Product landing + live service status
├── /playground           Interactive Redis demonstrations
│   ├── /playground/cache Cache-aside and hit/miss comparison
│   ├── /playground/keys  Key/value, data types, and TTL
│   ├── /playground/limits Rate-limiting demonstration
│   └── /playground/pubsub Pub/Sub demonstration (if supported safely)
├── /queues               BullMQ queue overview
│   ├── /queues/jobs      Job list and lifecycle
│   ├── /queues/jobs/[id] Job detail, attempts, results, and errors
│   └── /queues/workers   Worker status and concurrency
├── /docs                 Documentation shell
│   ├── /docs/quickstart  Local setup and hosted demo
│   ├── /docs/redis       Redis concepts and examples
│   ├── /docs/bullmq      Queue concepts and examples
│   ├── /docs/toolkit     Reusing packages in another project
│   ├── /docs/deployment  Free-tier deployment constraints
│   └── /docs/api         API reference
└── /about                Project, limitations, and AsterIQ attribution
```

### 4.1 Primary navigation

Overview · Redis Lab · Queue Studio · Docs · GitHub

### 4.2 Landing section order

1. Navigation — compact, dark, with restrained glass.
2. Hero — QueueKit name, clear promise, primary CTA, abstract Redis/queue flow visual.
3. Live system status — API, Redis connection, worker status; never fabricate status.
4. Explore Redis — cache, TTL, data structures, counters, rate limiting.
5. Explore BullMQ — enqueue, process, retry, delay, inspect.
6. How it works — API → queue → worker → Redis.
7. Reuse the toolkit — architecture, package boundaries, copy-ready setup.
8. Documentation and GitHub CTA.
9. Free-tier limitations and footer attribution.

---

## 5. Feature set

### 5.1 Redis playground

| ID | Feature | Description |
| --- | --- | --- |
| R1 | Connection status | Report API health and Redis connectivity from the backend; show unknown/offline states honestly |
| R2 | Key/value operations | Set, get, delete, and inspect allowlisted demo keys |
| R3 | TTL explorer | Set expiration and display remaining TTL with server-confirmed values |
| R4 | Data structures | Demonstrate strings, hashes, lists, sets, and sorted sets using bounded demo data |
| R5 | Cache-aside | Compare cache hit and miss behavior using a controlled mock data source |
| R6 | Cache metrics | Show hit/miss counts and approximate response-time comparisons, labeled as demo metrics |
| R7 | Counters | Demonstrate atomic increments and decrements |
| R8 | Rate limiting | Demonstrate a fixed-window or sliding-window limiter with clear scope and limits |
| R9 | Pub/Sub | Optional publish/subscribe example with explicit limitations around message durability |
| R10 | Reset demo | Clear only namespaced demo data after confirmation |

### 5.2 BullMQ Queue Studio

| ID | Feature | Description |
| --- | --- | --- |
| Q1 | Enqueue job | Submit a predefined demo job with validated payload |
| Q2 | Job lifecycle | Display waiting, active, delayed, completed, and failed states where applicable |
| Q3 | Retry policies | Demonstrate attempts and fixed/exponential backoff |
| Q4 | Delayed jobs | Schedule a demo job for later execution |
| Q5 | Priority | Compare jobs with different priority values |
| Q6 | Concurrency | Configure bounded worker concurrency for demonstration |
| Q7 | Failure simulation | Trigger a controlled, harmless failure to inspect retry behavior |
| Q8 | Job detail | Show payload, timestamps, attempts, result, and sanitized error details |
| Q9 | Queue controls | Pause/resume or clean only the dedicated demo queue, with safeguards |
| Q10 | Queue metrics | Show queue counts, processing duration, and failure rate when data is available |
| Q11 | Live updates | Push job status events over SSE, with polling fallback |
| Q12 | Worker health | Report whether the worker is active and when it last reported health |

### 5.3 Documentation

- Quickstart for local Docker development.
- Hosted demo usage and known limitations.
- Redis key design and TTL guidance.
- Cache-aside implementation.
- BullMQ queue and worker examples.
- Retry, backoff, delay, concurrency, and failure handling.
- Connection lifecycle and graceful shutdown.
- How to add a new queue and processor.
- How to copy or install the toolkit in another Node.js project.
- Environment variable reference.
- Deployment instructions for Cloudflare Pages and Railway.

### 5.4 Safety and reliability rules

- Never accept arbitrary Redis commands from unauthenticated users.
- Prefix demo keys and queues with a dedicated namespace, e.g. `queuekit:demo:`.
- Allow only predefined queue names and job types on the public demo.
- Validate all request bodies and cap payload sizes.
- Add per-IP or per-session rate limits and conservative job submission limits.
- Do not return secrets, raw connection URLs, or unsanitized internal stack traces.
- Destructive operations require explicit confirmation and must only target demo resources.
- Do not promise job durability or data persistence on ephemeral free-tier storage.
- Public demo operations must be safe to repeat and must not send real emails, SMS, payments, or external side effects.
- Apply CORS allowlisting for the deployed frontend origin.
- Use bounded retention for completed and failed demo jobs to avoid exhausting free resources.

---

## 6. Visual design system

### 6.1 Color tokens

Keep CSS variables in `src/app/globals.css` aligned with any tokens used by charts or documentation components.

| Token | Value | Use |
| --- | --- | --- |
| `--background` | `#09090b` | Main page canvas |
| `--surface` | `#111113` | Primary panels |
| `--surface-2` | `#18181b` | Nested panels and hover surfaces |
| `--foreground` | `#fafafa` | Primary text |
| `--muted` | `#a1a1aa` | Secondary text |
| `--accent` | `#ef4444` | Primary actions, highlights, focus |
| `--accent-foreground` | `#0a0a0b` | Text on accent actions |
| `--accent-soft` | `rgba(239, 68, 68, 0.12)` | Soft accent fills |
| `--border` | `rgba(255, 255, 255, 0.08)` | Dividers and panel edges |
| `--success` | Semantic green token | Completed jobs / healthy status |
| `--warning` | Semantic amber token | Delayed jobs / degraded status |
| `--danger` | `#ef4444` | Failed jobs / destructive warnings |

Status colors are semantic and independent of the brand accent. HTTP method colors, if shown, must also remain independent of the brand accent.

### 6.2 Typography

| Role | Font | Notes |
| --- | --- | --- |
| Display / headlines | Space Grotesk | Brand and page titles |
| Body | Inter | Readable interface copy |
| Mono | Geist Mono | Redis keys, JSON, queue names, code, logs |

### 6.3 Visual principles

- Use a subtle hexagonal grid in the landing hero and optionally the docs chrome; do not repeat it in every section.
- Use glassmorphism selectively for navigation, playground controls, and selected panels.
- Use purposeful motion for job lifecycle transitions and metric changes; avoid constant decorative animation.
- Keep charts restrained, labeled, and useful.
- Support responsive layouts, keyboard navigation, visible focus states, and reduced-motion preferences.
- Include a light/dark toggle if it can be implemented without delaying core functionality; dark mode is the default.

---

## 7. Technical architecture

### 7.1 Stack

| Layer | Choice |
| --- | --- |
| Language | TypeScript |
| Frontend framework | Next.js App Router |
| Frontend deployment | Cloudflare Pages using static export |
| Styling | Tailwind CSS + CSS variables |
| UI components | shadcn/ui |
| Motion | `motion` only for purposeful transitions |
| Icons | `lucide-react` |
| Charts | Recharts |
| Data tables | TanStack Table |
| API state | TanStack Query |
| Backend runtime | Node.js |
| Backend framework | Express |
| Redis client | `ioredis` |
| Queue library | BullMQ |
| Validation | Zod |
| API documentation | OpenAPI 3 + Scalar or a lightweight generated reference |
| Testing | Vitest + Supertest; integration tests against a real Redis container |
| E2E testing | Playwright for critical user journeys |
| Monorepo | npm workspaces |
| Local infrastructure | Docker Compose with Redis |
| CI | GitHub Actions |
| Hosting API | Railway web service, subject to current plan limits |
| Hosting worker | Same Node.js process as API for the free hosted demo; separate process locally and on paid hosting |
| Hosted datastore | Railway Redis / Key Value or other Redis-compatible store; verify limits before implementation |
| Frontend API URL | `NEXT_PUBLIC_QUEUEKIT_API_URL` |
| Configuration | Environment variables; `.env.example` committed, real secrets excluded |

### 7.2 Architecture constraints

- Cloudflare Pages must serve a static Next.js export; do not rely on Next.js server components that require a persistent Node.js server at runtime.
- The browser communicates with the Express API over HTTPS.
- Redis credentials remain server-side.
- Keep API, queue producer, worker, and toolkit code in separate modules even when API and worker run in the same free hosting process.
- The worker must be independently runnable for local development and future deployment.
- Use SSE for one-way live job updates; use polling as a fallback if the hosting environment or connection lifecycle makes SSE unreliable.
- The Redis client and BullMQ connections must be closed on graceful shutdown.
- Do not depend on the free hosted service staying awake or retaining Redis data.
- Check current provider support for Redis commands, BullMQ compatibility, persistence, eviction, and connection limits before locking in the production adapter.

---

## 8. Reusable toolkit strategy

The application must demonstrate the toolkit, but the toolkit must not depend on the demonstration app.

### 8.1 Package boundaries

| Package | Responsibilities |
| --- | --- |
| `@queuekit/redis-toolkit` | Redis client creation, connection lifecycle, typed key helpers, cache-aside helpers, TTL utilities, counters, health checks |
| `@queuekit/queue-toolkit` | BullMQ queue creation, typed job contracts, queue options, retry/backoff defaults, worker helpers, queue events |
| `@queuekit/shared` | Shared TypeScript types, validation schemas, error contracts, safe constants |
| `backend` | Express routes, request validation, demo authorization/limits, API response contracts; worker may run in-process on free tier or as a separate process locally |
| `frontend` | Next.js pages, interactive playground, metrics, queue monitoring, docs |

### 8.2 Reuse requirements

- Export explicit public APIs; do not expose internal modules by default.
- Keep configuration injectable; do not hard-code production URLs or credentials.
- Validate required environment variables at startup.
- Centralize connection creation and shutdown.
- Avoid creating a new Redis connection for every request.
- Document BullMQ's connection requirements; workers may require dedicated connections.
- Keep job payloads typed and versionable.
- Use dependency injection for processors where it improves testability.
- Make logging structured and avoid logging secrets or full sensitive payloads.
- Include unit and integration tests for critical behavior.
- Provide copy-ready examples and a minimal integration guide.
- Keep demo-only behavior outside the reusable packages.

### 8.3 Illustrative consumer API

The final public API should be deliberately small. Example shape only; do not treat these names as implemented until the package is built and tested.

```ts
const redis = createRedisInfrastructure({
  url: process.env.REDIS_URL,
});

const emailQueue = createQueue({
  name: "emails",
  connection: redis.queueConnection,
});

await emailQueue.add("send-email", {
  to: "demo@example.com",
  template: "welcome",
});
```

The consuming application owns the actual email processor. QueueKit provides infrastructure primitives, not application-specific business logic.

---

## 9. Repository structure

```text
queuekit/
├── frontend/                      # Next.js static-export frontend
│   ├── docs/
│   ├── src/app/
│   ├── src/components/
│   ├── src/features/
│   └── src/lib/
├── backend/                       # Express REST API (+ worker on free tier)
│   ├── docs/
│   └── src/
│       ├── routes/
│       ├── middleware/
│       ├── services/
│       ├── worker/                # Independently runnable BullMQ worker
│       └── app.ts
├── packages/
│   ├── redis-toolkit/
│   ├── queue-toolkit/
│   ├── shared/
│   └── config/
├── content/
│   └── docs/
├── tests/
│   ├── integration/
│   └── e2e/
├── docker-compose.yml
├── package.json              # npm workspaces root
├── package-lock.json
├── railway.toml
├── docker-compose.yml
├── .env.example
└── README.md
```

Keep components, feature modules, toolkit packages, API routes, and documentation separated. Avoid a monolithic page or one large backend file.

---

## 10. API surface

Use versioned routes under `/api/v1`. Exact routes may change during implementation, but the public contract should stay explicit and documented.

| Route | Purpose |
| --- | --- |
| `GET /health` | Basic API health |
| `GET /api/v1/status` | API, Redis, and worker status |
| `GET /api/v1/redis/demo/keys` | List allowlisted demo keys |
| `POST /api/v1/redis/demo/keys` | Create/update a demo key |
| `GET /api/v1/redis/demo/keys/:key` | Read a namespaced demo key |
| `DELETE /api/v1/redis/demo/keys/:key` | Delete a demo key |
| `POST /api/v1/redis/demo/cache` | Run a cache-aside demonstration |
| `POST /api/v1/redis/demo/rate-limit` | Run a bounded rate-limit demonstration |
| `GET /api/v1/redis/demo/pubsub/channels` | List allowlisted demo Pub/Sub channels |
| `POST /api/v1/redis/demo/pubsub/publish` | Publish on an allowlisted Redis channel |
| `GET /api/v1/redis/demo/pubsub/events` | SSE bridge for Redis Pub/Sub messages |
| `POST /api/v1/queues/:queue/jobs` | Enqueue an allowlisted demo job |
| `GET /api/v1/queues/:queue/jobs` | List recent demo jobs |
| `GET /api/v1/queues/:queue/jobs/:jobId` | Inspect a demo job |
| `GET /api/v1/queues/:queue/metrics` | Queue counts and available metrics |
| `GET /api/v1/events` | SSE stream for allowed demo events |
| `POST /api/v1/demo/reset` | Reset only namespaced demo resources |

The public demo API must use strict validation, response-size limits, request limits, safe error responses, and a controlled set of operations. Never implement a generic endpoint that forwards arbitrary user input to Redis.

---

## 11. Hosting & operations

### 11.1 Intended deployment

```text
GitHub monorepo
├── Cloudflare Pages
│   └── Next.js static export
└── Railway
    └── Express API + BullMQ worker in one process
        └── Redis / compatible datastore
```

### 11.2 Free-tier assumptions

| Component | Intended free option | Constraint to plan for |
| --- | --- | --- |
| Frontend | Cloudflare Pages | Static export; no Next.js server runtime |
| API | Railway web service | Cold starts, quotas, possible sleep |
| Worker | Same process as API | Jobs run only while the service is running; worker is not an independent always-on service |
| Redis-compatible store | Railway Redis / Key Value or external Redis | Confirm current plan, compatibility, limits, and data-loss behavior |
| CI | GitHub Actions | Included usage limits apply |
| Custom domain | Existing domain, if available | DNS and domain renewal may have separate costs |

**Do not assume a permanent ₹0 bill without checking current provider terms.** Free tiers change, and some services or capabilities may be unavailable in a particular region or account.

### 11.3 Expected demo behavior

- First request after inactivity may be slow.
- Redis or the API may be temporarily unavailable.
- Redis data and job records may disappear after a restart if the selected service is ephemeral.
- Queue status may be empty after a restart.
- The UI must show unavailable, reconnecting, or unknown states instead of inventing values.
- Include a clear notice that the hosted playground is for learning and experimentation only.

### 11.4 Local development

- Use Docker Compose to run Redis locally.
- Run the frontend, API, and worker as separate development processes.
- Use a single `.env.example` with per-app environment variable documentation.
- Provide scripts for `dev`, `build`, `lint`, `typecheck`, `test`, `test:integration`, and `test:e2e`.
- Ensure tests can run without access to the public hosted demo.

---

## 12. Implementation plan

| Phase | Scope | Exit criteria |
| --- | --- | --- |
| 1. Scaffold | npm workspaces monorepo, TypeScript, linting, environment validation, Docker Compose | All apps and packages build |
| 2. Redis toolkit | Lifecycle, health checks, cache-aside, TTL, counters, safe key namespace | Unit and integration tests pass |
| 3. BullMQ toolkit | Queue factory, typed jobs, worker lifecycle, retry/backoff, failure handling | Jobs can be enqueued, processed, retried, and inspected locally |
| 4. API | Versioned endpoints, Zod validation, error handling, rate limits | API contracts and integration tests pass |
| 5. Frontend foundation | Design tokens, navigation, responsive layout, status components | Static export builds successfully |
| 6. Playground UI | Redis Explorer and Cache Lab | UI calls real API operations and handles failures |
| 7. Queue Studio | Job creation, job details, metrics, live updates | Full job lifecycle visible in UI |
| 8. Docs and reuse | Quickstart, API docs, integration examples | A separate sample application can consume the toolkit |
| 9. CI and deployment | GitHub Actions, Cloudflare Pages, Railway | Public demo deployed and documented |
| 10. Hardening | Rate limits, retention, safe reset, accessibility, failure states | Public demo has bounded resource use and no unrestricted operations |

Do not build all UI screens before validating the Redis and BullMQ integration locally. A dashboard that looks complete but cannot reliably demonstrate queue behavior is not a successful implementation.

---

## 13. Quality checklist

### Product

- [ ] Landing page explains QueueKit in one sentence.
- [ ] Redis playground executes real operations against the configured backend.
- [ ] BullMQ jobs are genuinely processed by a worker.
- [ ] UI distinguishes live service results from simulated comparison data.
- [ ] Job detail includes attempts, timestamps, result, and safe error information.
- [ ] Service status and failure states are honest.
- [ ] Reset affects only dedicated demo resources.
- [ ] Documentation explains how to reuse the toolkit.

### Engineering

- [ ] TypeScript strict mode enabled.
- [ ] Environment variables validated at startup.
- [ ] No secrets committed or exposed to the browser.
- [ ] Redis and BullMQ resources close cleanly.
- [ ] API inputs and payload sizes are bounded.
- [ ] Public routes are rate-limited.
- [ ] Job retention and demo data are bounded.
- [ ] Unit, integration, and critical E2E tests exist.
- [ ] GitHub Actions runs lint, typecheck, tests, and builds.
- [ ] Cloudflare static export succeeds.
- [ ] Free-tier limitations are documented.

### Visual

- [ ] Dark ink canvas and signal-red accent are consistent.
- [ ] Space Grotesk, Inter, and Geist Mono are used consistently.
- [ ] Navigation and panels remain readable on mobile.
- [ ] Status indicators are accessible and not color-only.
- [ ] Motion respects reduced-motion preferences.
- [ ] Charts communicate meaningful values and label demo metrics clearly.

---

*Living product reference. Update this file whenever product, architecture, design, or hosting decisions change.*
