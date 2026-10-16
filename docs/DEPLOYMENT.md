# QueueKit deployment

One Git repository. Two deployables. Shared libraries stay in `packages/`.

```text
queuekit/                 ← GitHub repo
├── frontend/             → Cloudflare Pages
├── backend/              → Railway (Node web service)
└── packages/             → built with the backend (not a separate service)
```

## Local development

```bash
# from repo root
docker compose up -d
cp .env.example backend/.env   # set REDIS_URL if needed
npm install                    # also builds @queuekit/shared + redis-toolkit
npm run dev:backend            # http://localhost:8000
npm run dev:frontend           # http://localhost:3000
```

Set frontend `NEXT_PUBLIC_QUEUEKIT_API_URL=http://localhost:8000` (see `frontend/.env.example`).

## Railway (backend + worker)

**Critical:** Root Directory must be the **repository root**, not `backend/`.  
`file:` / workspace packages live in `packages/` and must be visible at install time.

| Setting | Value |
| --- | --- |
| Root Directory | `/` (empty / repo root) |
| Build Command | `npm ci && npm run build:backend` (or use `railway.toml`) |
| Start Command | `npm run start:backend` |
| Required env | `REDIS_URL`, `CORS_ORIGIN`, `QUEUEKIT_API_HOST_URL`, `PORT` |

Also set:

- `CORS_ORIGIN` = your Cloudflare Pages origin (e.g. `https://queuekit.pages.dev`)
- `QUEUEKIT_API_HOST_URL` = your Railway public HTTPS URL
- `NODE_ENV=production`
- `RUN_WORKER=true` (API + demo worker in one process on free tier)

Redis: attach Railway Redis / Key Value, or point `REDIS_URL` at any Redis-compatible store.

### Free-tier expectations

- Cold starts after sleep — first request may be slow
- Redis keys and queue jobs may vanish after restarts (ephemeral storage)
- Worker runs in the same process as the API while the service is awake
- Tune `RATE_LIMIT_*`, `JOB_RATE_LIMIT_*`, and `RESET_RATE_LIMIT_*` if the public demo is hammered

## Cloudflare Pages (frontend)

The web app depends on workspace package `@queuekit/shared`. Build from the **repository root**, not `frontend/` alone, or install will miss the package.

| Setting | Value |
| --- | --- |
| Root Directory | `/` (empty / repo root) |
| Build command | `npm ci && npm run build:frontend` |
| Output directory | `frontend/out` |
| Framework preset | None (static export) |

Environment variable (Pages → Settings → Environment variables):

- `NEXT_PUBLIC_QUEUEKIT_API_URL` = Railway API origin (no trailing slash), e.g. `https://queuekit-api.up.railway.app`

Static export only (`output: 'export'` in `frontend/next.config.ts`). No Next.js Node server runtime on Pages.

`frontend/public/_headers` is copied into `out/` for basic security headers on static assets.

## Why not separate Git repos for packages?

`@queuekit/shared` and `@queuekit/redis-toolkit` are libraries consumed by the API.  
Keeping them in this monorepo avoids private npm publishing while still deploying frontend and backend independently.

If you later split into two GitHub repos: move `packages/` **into the backend repo**, not the frontend repo.
