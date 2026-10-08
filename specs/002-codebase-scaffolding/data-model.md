# Data Model: Codebase Scaffolding

This feature creates no business data and no MongoDB collections (spec FR-016). The model below
describes the structural entities from the spec and the configuration schemas the boilerplate depends on.

## 1. Workspace

| Field | Description |
|---|---|
| `packageManager` | pnpm version pinned in root `package.json` |
| `members` | `apps/*`, `packages/*`, `end-to-end` |
| `tasks` | Turbo tasks: `build`, `dev`, `lint`, `typecheck`, `format:check`, `test`, `test:integration`, `test:e2e` |

**Rules**: every member extends `tsconfig.base.json`; every member defines the tasks that apply to it;
adding a task requires updating `turbo.json` and CI together.

## 2. Component

| Component | Type | Port | Health endpoint | Depends on |
|---|---|---|---|---|
| `lead-web` | Next.js app | 3000 | `GET /api/health` | `lead-service` |
| `lead-service` | NestJS HTTP | 3001 | `GET /api/v1/health` | MongoDB, Redis |
| `lead-background-service` | NestJS hybrid (Kafka + HTTP) | 3002 | `GET /health` | Kafka, MongoDB |

**Relationships**: `lead-web → lead-service` (server-side only); `lead-background-service` writes to
MongoDB directly (per architecture doc), never through `lead-service`.

## 3. Shared Package — `@lead/shared-contracts`

| Export | Shape |
|---|---|
| `API_PREFIX` | `'api/v1'` |
| `ErrorResponse` | `{ statusCode: number; message: string \| string[]; error: string }` |
| `HealthStatus` | `'up' \| 'down'` |
| `HealthResponse` | `{ status: 'ok' \| 'degraded' \| 'down'; db: HealthStatus; redis: HealthStatus }` |

**Rules**: browser-safe, no Node/Nest imports, no business types.

## 4. Environment Configuration (validated at boot)

Authoritative list in [contracts/environment-variables.md](./contracts/environment-variables.md).
Validation rules: required keys must be present; ports are integers 1–65535; URIs must parse; secrets
(JWT, API key) must be non-empty and at least 32 characters outside `test`. A failed validation aborts
startup with an error naming the key.

## 5. Local Environment (compose)

Services, health checks, and start ordering in
[contracts/compose-services.md](./contracts/compose-services.md). State transitions:
`starting → healthy` per service; the environment is *ready* when all services are `healthy`.

## 6. Test Assets

| Asset | Location | Purpose |
|---|---|---|
| Unit samples | `*.spec.ts` / `*.test.tsx` beside source | Prove runners work (FR-015) |
| Integration | `apps/lead-service/test/integration` | Health endpoint, validation error shape, 404 shape against real MongoDB/Redis |
| Smoke features | `end-to-end/features/smoke` | Login page renders; `/api/v1/health` reports up |

## 7. Pipeline

Defined in [contracts/ci-pipeline.md](./contracts/ci-pipeline.md): triggers, jobs, ordered steps,
required status checks.

## Deferred (not modeled here)

Business collections (`users`, `leads`, `lead_activities`, customers), cache key schemes, and Kafka
event schemas belong to later feature specs derived from `docs/system-design-architecture.md`.
