# `@queuekit/api`

Express + TypeScript API for the QueueKit Redis / BullMQ playground.

Part of the **QueueKit npm workspaces monorepo**. Prefer running scripts from the repo root.

## Layout

```text
backend/
├── docs/PLAN.md
├── scripts/
├── src/
│   ├── app.ts
│   ├── index.ts
│   ├── cache/          # wires @queuekit/redis-toolkit
│   ├── queues/         # wires @queuekit/queue-toolkit
│   ├── config/
│   ├── controllers/
│   ├── middlewares/    # rate limits, error sanitization, unsafe-route rejects
│   ├── routes/
│   ├── services/
│   ├── worker/
│   └── ...
└── tests/
```

## Local

From repo root:

```bash
npm install
cp .env.example backend/.env
npm run dev:backend
```

Or from this folder after a root install:

```bash
npm run dev
```

- Health: http://localhost:8000/health
- Docs: http://localhost:8000/docs

## Public API (frontend contract)

| Area | Routes |
| --- | --- |
| Ops | `GET /health`, `GET /ready`, `GET /version` |
| Status | `GET /api/v1/status` |
| Redis demo | keys, cache, rate-limit, **counter**, **structures** |
| Queues | jobs list/detail/enqueue, metrics |
| Events | `GET /api/v1/events` (SSE) |
| Reset | `POST /api/v1/demo/reset` (`confirm: true`) |

Shared contracts: import from `@queuekit/shared` (not local shims).

## Safety (Phase 6)

- Per-IP global rate limit; stricter caps on job enqueue and demo reset
- No Redis command / eval / raw forwarders (explicit 404)
- Allowlisted demo keys, queues, and job types only
- Demo reset requires `confirm: true` and a demo-scoped key prefix
- Public errors never include stacks, connection URLs, or secrets

## Free-tier behavior

On Railway free tier (and similar hosts):

- Cold starts after sleep — first request may be slow
- Redis/job data may be ephemeral and disappear after restarts
- Worker runs in-process only while the web service is awake (`RUN_WORKER=true`)
- Treat `unknown` / `offline` status as real; do not invent healthy values

See OpenAPI (`/docs`) for the full public contract and limitations text.

## Production (Railway)

Build/start from **monorepo root** (see `railway.toml` and `docs/DEPLOYMENT.md`).  
Do not set Railway Root Directory to `backend/` alone — workspace packages will not install.
