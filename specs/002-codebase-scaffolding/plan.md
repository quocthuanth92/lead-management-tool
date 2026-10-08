# Implementation Plan: Codebase Scaffolding

**Branch**: `002-codebase-scaffolding` | **Date**: 2026-10-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-codebase-scaffolding/spec.md`

## Summary

Stand up the monorepo skeleton implied by the High-Level Diagram in `docs/system-design-architecture.md`:
`lead-web` (Next.js) → `lead-service` (NestJS) → Redis → MongoDB, plus `lead-background-service`
(Kafka consumer) and a Cucumber + Playwright end-to-end project. Deliver, in this order: (1) pnpm/Turborepo
workspace and shared tooling, (2) the NestJS backend services, (3) the Next.js frontend, (4) the
Cucumber/Gherkin + Playwright E2E project, (5) Dockerfiles and a docker-compose environment, (6) GitHub
Actions CI/CD. Only structure, wiring, health checks, and sample tests are built; no lead business
behavior (FR-016). Design decisions are in [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript (strict) on Node.js 24 LTS (`.nvmrc`, `engines`); TypeScript major pinned
to the latest one supported by `typescript-eslint` and the Nest CLI at install time (research R-02).

**Primary Dependencies**: pnpm workspaces + Turborepo; NestJS (`@nestjs/config`, `@nestjs/mongoose`,
`@nestjs/jwt`, `@nestjs/terminus`, `@nestjs/throttler`, `@nestjs/microservices` with KafkaJS),
`class-validator`/`class-transformer`, `ioredis`, Mongoose; Next.js 16 (App Router) with React 19,
`@tanstack/react-query`, `zod`, Tailwind CSS; `@cucumber/cucumber` + `@playwright/test` (library API).

**Storage**: MongoDB (source of truth, single-node replica set locally); Redis (cache-aside, rate
limiting). Structural wiring only — no collections or schemas are created in this feature.

**Testing**: Jest (unit, all apps); Supertest + Testcontainers (lead-service integration);
React Testing Library + Jest (lead-web); Cucumber (Gherkin) + Playwright (E2E smoke).

**Target Platform**: Linux containers (Docker); developer machines on Windows, macOS, Linux; GitHub
Actions `ubuntu-latest` runners.

**Project Type**: Monorepo web application (frontend + backend services + background worker + E2E).

**Performance Goals**: Not applicable to boilerplate beyond SC-003 (full local environment healthy in
under 3 minutes) and SC-001 (clone to running in under 15 minutes). Runtime targets (p95 < 300 ms) are
inherited from the architecture document and belong to later feature work.

**Constraints**: All APIs under `/api/v1`; shared error shape `{ statusCode, message, error }`;
environment-specific values only via validated environment variables; access token never exposed to the
browser; no business logic in controllers/route handlers/UI; format, lint, and type-check clean.

**Scale/Scope**: 3 deployable apps, 1 shared package, 1 E2E project, 6 Docker services, 2 workflows.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                         | Gate                                                                                                                                                                                   | Pre-research | Post-design                      |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | -------------------------------- |
| I. Clean & Hexagonal Architecture | Modules split into domain / application / infrastructure / interface; ports live in domain/application, adapters in infrastructure; FE/BE separated; architecture doc is authoritative | PASS         | PASS — research R-04, R-05       |
| II. Verify Before Modification    | Existing files (`apps/*`, `end-to-end/`, `docker-compose.yml`, `.gitignore`) inspected before editing; empty `apps/*` and 0-byte `docker-compose.yml` confirmed                        | PASS         | PASS                             |
| III. Code Quality Gates           | Format, lint, type-check tasks defined at root and enforced in CI                                                                                                                      | PASS         | PASS — `ci.yml` quality job      |
| IV. Skills-First Implementation   | `lead-service.instructions.md` and `lead-web.instructions.md` read; MongoDB and Next.js skills to be loaded when each layer is implemented                                             | PASS         | PASS                             |
| V. Testing Policy                 | Sample unit tests per app; integration test for the REST health endpoint (REST + persistence wiring)                                                                                   | PASS         | PASS — data-model §6, quickstart |
| Constraints                       | `pnpm`/`turbo`; `turbo.json` + CI updated together; `/api/v1`; no hard-coded config; spec exists                                                                                       | PASS         | PASS                             |

**Known tension (resolved, no violation):**

- `lead-service.instructions.md` shows a flat controller/service/repository layout and a TypeORM
  section, while the stack is MongoDB and the constitution requires hexagonal boundaries. Decision:
  keep the guide's `common/`, `core/`, `modules/`, `shared/` top-level shape and naming conventions,
  nest layer folders inside each module, and use Mongoose (R-04).
- `docs/system-design-architecture.md` does not yet spell out port-placement rules (constitution
  TODO). This plan proposes them (R-05); a follow-up folds them into the architecture document.

## Project Structure

### Documentation (this feature)

```text
specs/002-codebase-scaffolding/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── lead-service-health.openapi.yaml
│   ├── error-response.schema.json
│   ├── environment-variables.md
│   ├── compose-services.md
│   └── ci-pipeline.md
├── checklists/requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
package.json                     # root scripts: build, dev, lint, format, typecheck, test, test:e2e
pnpm-workspace.yaml              # apps/*, packages/*, end-to-end
turbo.json                       # build, lint, typecheck, test, test:integration, test:e2e tasks
tsconfig.base.json               # strict base config extended by every package
eslint.config.mjs                # shared flat ESLint config
.prettierrc.json / .prettierignore / .editorconfig / .nvmrc / .npmrc
docker-compose.yml               # full local environment (existing empty file is filled in)
.dockerignore
README.md                        # install / run / test / containerize (FR-017)

.github/workflows/
├── ci.yml                       # PR + main: quality job, integration, e2e job
└── docker.yml                   # main: build (and push) images for each deployable

packages/
└── shared-contracts/            # @lead/shared-contracts: error shape, API prefix, health types
    ├── package.json  tsconfig.json
    └── src/
        ├── errors/error-response.ts
        ├── api/constants.ts     # API_PREFIX = 'api/v1'
        ├── health/health-response.ts
        └── index.ts

apps/lead-service/
├── Dockerfile  nest-cli.json  tsconfig*.json  jest.config.ts  package.json
├── .env.example
├── tsconfig.json
├── src/
│   ├── main.ts                  # prefix, global ValidationPipe, exception filter, helmet, shutdown hooks
│   ├── app.module.ts
│   ├── common/
│   │   ├── decorators/  filters/(all-exceptions.filter.ts)  guards/  interceptors/  interfaces/
│   ├── core/
│   │   ├── config/              # env schema + ConfigModule (fail-fast)
│   │   ├── database/            # DatabaseModule (MongooseModule.forRootAsync)
│   │   └── redis/               # RedisModule (ioredis provider, tolerant of outages)
│   ├── modules/
│   │   ├── health/              # GET /api/v1/health (real, Terminus)
│   │   ├── auth/                # skeleton: AuthModule + JwtModule config, guard placeholder
│   │   ├── users/               # skeleton
│   │   ├── leads/               # skeleton (layers below)
│   │   │   ├── domain/          # entities, value objects, ports (repository & cache interfaces)
│   │   │   ├── application/     # use-cases / services depending only on ports
│   │   │   ├── infrastructure/  # Mongoose schemas, repository + cache adapters
│   │   │   ├── interface/http/  # controllers, DTOs (thin)
│   │   │   └── leads.module.ts
│   │   └── cache/               # skeleton CacheModule exposing a CachePort, Redis adapter
│   └── shared/                  # constants, small shared services
└── test/
    └── integration/             # Supertest + Testcontainers (health, error shape, validation)
                                 # unit samples live next to sources as *.spec.ts

apps/lead-background-service/
├── Dockerfile  nest-cli.json  tsconfig*.json  jest.config.ts  package.json
├── .env.example
├── tsconfig.json
└── src/
    ├── main.ts                  # hybrid app: Kafka microservice transport + HTTP health port
    ├── app.module.ts
    ├── core/config/
    └── modules/
        ├── health/              # GET /health (Terminus: broker + db)
        └── lead-consumer/
            ├── domain/ application/ infrastructure/ interface/kafka/
            └── lead-consumer.module.ts   # placeholder consumer, retry + dead-letter topic constants

apps/lead-web/
├── Dockerfile  next.config.ts  tsconfig.json  jest.config.ts  package.json
├── .env.example
├── tsconfig.json
├── public/
└── src/
    ├── app/
    │   ├── layout.tsx  globals.css  providers.tsx
    │   ├── (auth)/login/page.tsx
    │   ├── (app)/leads/page.tsx            # inbox shell
    │   ├── (app)/leads/[id]/page.tsx       # details shell
    │   └── api/                            # BFF route handlers (thin): health + proxy placeholder
    ├── components/  hooks/  contexts/  types/
    ├── lib/
    │   ├── server/                         # server-only: lead-service client, session/cookie helpers
    │   └── query/                          # React Query client setup
    └── proxy.ts                            # Next 16 request interception (name verified at implementation)

end-to-end/                      # @lead/e2e — Cucumber (Gherkin) + Playwright
├── package.json  tsconfig.json  cucumber.mjs  .env.example
├── features/smoke/              # web.feature, service-health.feature
├── step-definitions/            # web.steps.js, service.steps.js
├── support/                     # world.js, hooks.js, config.js, api-client.js
└── reports/                     # git-ignored: cucumber-report.html/json, traces

docker-compose.yml
```

**Structure Decision**: pnpm-workspace monorepo with `apps/*` (deployables), `packages/shared-contracts`
(only genuinely shared, browser-safe contracts), and the E2E project at the existing `end-to-end/` path.
Each Nest module uses the four hexagonal layers; controllers (interface layer) call application
use-cases, which depend on domain ports implemented by infrastructure adapters. The web app keeps
`src/app` routing thin and confines lead-service access to `src/lib/server`.

## Delivery Sequence

Maps to the six requested steps; each step ends with a verifiable checkpoint.

| #   | Step                                     | Outputs                                                                                                                               | Checkpoint                                                                             |
| --- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 1   | Set up the monorepo                      | root manifests, `turbo.json`, base TS/ESLint/Prettier configs, `.nvmrc`, `.env.example`, `packages/shared-contracts`, README skeleton | `pnpm install`; `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm format:check` green |
| 2   | Create the backend service               | `apps/lead-service` (modules, config, DB/Redis, health, error filter, auth skeleton) and `apps/lead-background-service`               | `pnpm --filter lead-service test` and `test:integration`; `/api/v1/health` responds    |
| 3   | Create the frontend                      | `apps/lead-web` route shells, layout, providers, server-only client, BFF health route                                                 | `pnpm --filter lead-web test`; routes render; no token in browser bundle               |
| 4   | E2E with Cucumber (Gherkin) + Playwright | `end-to-end/` project with smoke features for web and service                                                                         | `pnpm test:e2e` passes against compose environment; report generated                   |
| 5   | Docker                                   | `docker --version` verified; Dockerfiles per app; `docker-compose.yml` with mongo, redis, kafka, three apps (+ `e2e` profile)         | `docker compose up --build --wait` → all healthy in < 3 min                            |
| 6   | GitHub Actions CI/CD                     | `ci.yml` and `docker.yml`; `turbo.json` kept in sync                                                                                  | workflows lint-valid; PR run executes every gate                                       |

Prerequisite notes (verified in this environment): Node 24 and Docker 29 are installed; `pnpm` is not on
PATH — enable via Corepack (`corepack enable`; the `packageManager` field pins the version).

## Complexity Tracking

No constitution violations. Items worth justifying:

| Item                                   | Why Needed                                                                        | Simpler Alternative Rejected Because                                    |
| -------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Separate `lead-background-service` app | Present in the High-Level Diagram and repo instructions                           | Folding into lead-service would break the documented component boundary |
| `packages/shared-contracts`            | Constitution requires typed shared contracts; FE and BE both need the error shape | Duplicating types risks drift between browser-facing and API code       |
| Testcontainers integration tests       | Constitution V requires integration tests for REST/persistence changes            | Mocks would not verify real DB/Redis wiring                             |
