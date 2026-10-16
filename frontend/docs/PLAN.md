# QueueKit Web — Implementation & Unit Test Plan

> App: `frontend` (Next.js static-export frontend)  
> Related API: `backend` via `NEXT_PUBLIC_QUEUEKIT_API_URL`  
> Source of truth: [QUEUEKIT_PRODUCT_SPEC.md](../../QUEUEKIT_PRODUCT_SPEC.md)

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Language | TypeScript (strict) |
| Framework | Next.js App Router |
| Deployment | Cloudflare Pages (static export — no Node server runtime) |
| Styling | Tailwind CSS v4 + ChaiUI CSS variables |
| UI components | ChaiUI (`@chaiui` shadcn registry from ui.chaicode.com) |
| Icons | `lucide-react` |
| Motion | `motion` (purposeful transitions only) |
| Charts | Labeled metric cards (Recharts deferred; demo vs live chips required) |
| Data tables | Native tables / lists (TanStack Table deferred) |
| Server state | TanStack Query |
| Live updates | SSE client + polling fallback |
| Fonts | Manrope, Montserrat, Onest, Geist Mono (via ChaiUI theme) |
| Unit / component tests | Vitest + Testing Library (React) |
| E2E | Playwright (critical journeys; shared under `tests/e2e`) |
| Monorepo | npm workspaces (repo root) |
| Config | `NEXT_PUBLIC_QUEUEKIT_API_URL` and other public env only |

**Out of scope for this app:** Express routes, Redis credentials, BullMQ workers, server-side secrets.

**Hard constraint:** Static export only. Do not depend on Next.js server components that need a persistent Node runtime on Cloudflare Pages.

---

## Implementation plan

Complete top to bottom. Validate API connectivity and failure states before polishing every screen.

### Phase 1 — Scaffold

- [x] Initialize `frontend` in the pnpm workspace
- [x] Configure Next.js App Router + static export for Cloudflare Pages
- [x] Enable TypeScript strict mode
- [x] Add Tailwind + CSS variables in `globals.css` (ChaiUI theme)
- [x] Add font loading (Manrope, Montserrat, Onest, Geist Mono via ChaiUI)
- [x] Wire `dev`, `build`, `lint`, `typecheck`, `test` scripts
- [x] Confirm `next build` / static export succeeds

### Phase 2 — Design system & shell

- [x] Implement color tokens via `@chaiui/chaiui` theme
- [x] Build layout shell: nav, content region, footer (`PageShell`)
- [x] Primary nav: Overview · Redis Lab · Queue Studio · Docs · GitHub
- [x] Restrained glass treatment for nav / controls (ChaiUI navbar blur-on-scroll)
- [x] Responsive layout + visible focus states
- [x] Reduced-motion preference support (ChaiUI motion components)
- [x] Light/dark toggle (ChaiUI `ThemeSwitcher`, dark default)

### Phase 3 — API client & status

- [x] Create typed API client using `NEXT_PUBLIC_QUEUEKIT_API_URL`
- [x] Configure TanStack Query defaults (retries, stale times appropriate for demo)
- [x] Build live system status component (API / Redis / worker)
- [x] Honest unknown / offline / reconnecting states — never fabricate health
- [x] Hosted-demo disclaimer copy wired into landing / footer

### Phase 4 — Landing page

- [x] Hero: QueueKit name, promise, primary CTA, abstract Redis/queue visual
- [x] Live system status section (unknown until API client)
- [x] Explore Redis teaser → playground routes
- [x] Explore BullMQ teaser → queue routes
- [x] How it works: API → queue → worker → Redis
- [x] Reuse the toolkit section
- [x] Docs + GitHub CTA
- [x] Free-tier limitations + AsterIQ attribution footer

### Phase 5 — Redis Lab (`/playground`)

- [x] `/playground` index / routing
- [x] `/playground/keys` — key/value, types, TTL
- [x] `/playground/cache` — cache-aside hit/miss + labeled demo metrics
- [x] `/playground/limits` — rate-limit demonstration
- [x] `/playground/pubsub` — real Redis PUBLISH/SUBSCRIBE (allowlisted channels + SSE bridge)
- [x] Reset demo control (confirmation required; namespaced only)
- [x] Failure / unavailable UI for every Redis action

### Phase 6 — Queue Studio (`/queues`)

- [x] `/queues` overview
- [x] Enqueue allowlisted demo job (validated form)
- [x] Job list with lifecycle states (waiting / active / delayed / completed / failed)
- [x] `/queues/jobs/detail?id=` — payload, attempts, timestamps, result, sanitized errors (static-export safe; not dynamic `[id]`)
- [x] Retry / delay / priority / failure-simulation controls as exposed by API (enqueue `delayMs`/`priority`/`fail`; auto-retry for fail only — no manual retry route)
- [x] Queue metrics (counts when available; duration/failure-rate omitted — not in API)
- [x] `/queues/workers` — worker health from `/status` + documented concurrency default
- [x] SSE live updates with polling fallback
- [x] Pause / resume omitted (no API); clean via confirmed demo reset only

### Phase 7 — Docs shell & about

- [x] `/docs` shell and navigation
- [x] Wire content for quickstart, Redis, BullMQ, toolkit, deployment, API
- [x] `/about` — project, limitations, AsterIQ attribution
- [x] Label simulated comparison data vs live service results everywhere relevant

### Phase 8 — Polish & deploy readiness

- [x] Charts label demo metrics clearly
- [x] Keyboard navigation across playground controls
- [x] Status indicators not color-only
- [x] Motion limited to job lifecycle / metric transitions
- [x] Cloudflare Pages static deploy config verified
- [x] No secrets in client bundle

---

## Unit testing checklist

Order is utilities → hooks/client → components → feature modules → pages. Prefer Vitest + Testing Library; mock the API client and SSE. Playwright E2E is separate and does not replace this list.

### A. Config & tooling

- [x] Public env (`NEXT_PUBLIC_QUEUEKIT_API_URL`) is read safely with a clear fallback/error UX when missing in tests
- [x] Static export config remains valid (smoke assertion or build script check documented)
- [x] Design tokens / theme helpers return expected CSS variable usage

### B. API client utilities

- [x] Base URL construction is correct
- [x] JSON parse / typed response mapping for happy path
- [x] Network failure maps to a typed client error
- [x] Non-2xx responses map status + safe message (no assumed body shape crash)
- [x] Request helpers for Redis demo keys (list / get / set / delete)
- [x] Request helpers for cache and rate-limit demos
- [x] Request helpers for queue jobs / metrics / reset
- [x] Status helper maps API / Redis / worker fields without inventing defaults

### C. Query hooks

- [x] Status query exposes loading / error / success states
- [x] Redis keys query invalidates on mutation success
- [x] Cache demo mutation updates metrics in cache or triggers refetch
- [x] Enqueue mutation invalidates job list
- [x] Job detail query handles not-found
- [x] Reset mutation invalidates Redis + queue queries

### D. SSE / polling

- [x] SSE client connects to `/api/v1/events` with expected params
- [x] Event parser accepts allowlisted event shapes only
- [x] Malformed events are ignored without crashing
- [x] Disconnect / cleanup on unmount
- [x] Polling fallback activates when SSE is unavailable
- [x] Polling stops when SSE recovers or component unmounts

### E. Design system & shared UI

- [x] Button / control variants render expected labels and disabled states
- [x] Status badge maps healthy / degraded / offline / unknown correctly
- [x] Status badge is not color-only (text or aria available)
- [x] Confirmation dialog blocks destructive action until confirmed
- [x] Empty / loading / error panel components render accessible text
- [x] Reduced-motion path skips non-essential animation classes/props

### F. Landing & shell

- [x] Nav links render primary destinations
- [x] Hero renders product name + primary CTA
- [x] Live status section shows unknown when API fails
- [x] Disclaimer / free-tier notice is present
- [x] Footer includes AsterIQ attribution

### G. Redis Lab features

- [x] Keys form validates input before submit
- [x] Keys view shows TTL from server-confirmed values
- [x] Cache lab distinguishes hit vs miss in UI copy
- [x] Cache metrics labeled as demo metrics
- [x] Rate-limit UI shows allow vs deny with clear scope
- [x] Reset requires confirmation and explains namespace scope
- [x] Each playground surface handles API error without blank screen

### H. Queue Studio features

- [x] Enqueue form rejects invalid payload client-side
- [x] Job list maps lifecycle states to labels
- [x] Job detail shows attempts, timestamps, result, sanitized error
- [x] Metrics chart/table renders empty state when no data
- [x] Worker health shows last-reported / offline honestly
- [x] Live job update applies SSE (or poll) patch to list/detail
- [x] Queue controls disabled or blocked when API reports unavailable

### I. Docs & about

- [x] Docs shell renders nav sections
- [x] About page states non-production / free-tier limitations
- [x] Simulated vs live data callouts render where required by feature flags/copy

### J. Accessibility & responsiveness (unit-level)

- [x] Interactive controls have accessible names
- [x] Focus-visible styles present on primary controls (class or role assertions)
- [x] Critical layouts do not rely on hover-only actions
- [x] Color-only status is covered by text alternative tests (see E)

### K. Safety (client)

- [x] No Redis URL / secrets referenced in client modules
- [x] Client never sends arbitrary Redis commands
- [x] Destructive UI paths always go through confirmation

---

## Exit criteria

- [x] All Phase 1–8 implementation items checked
- [x] Unit checklist A–K green under Vitest + Testing Library
- [x] Static export builds successfully for Cloudflare Pages
- [x] UI never fabricates service health or invents job/Redis values
- [x] Demo metrics and simulated comparisons are explicitly labeled

---

*Update this file as phases complete. Keep checkboxes honest — unchecked means not done.*
