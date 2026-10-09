# Research: Codebase Scaffolding

All Technical Context unknowns are resolved below. Package versions were looked up on the npm registry
on 2026-10-08; the implementation MUST pin exact versions via the lockfile and re-verify peer-dependency
compatibility at install time.

| Package                               | Latest at planning time | Plan                                                 |
| ------------------------------------- | ----------------------- | ---------------------------------------------------- |
| pnpm                                  | 12.x                    | Pinned via `packageManager`, activated with Corepack |
| turbo                                 | 2.11                    | Root devDependency                                   |
| @nestjs/core, microservices, terminus | 12.x                    | Use latest stable major                              |
| @nestjs/mongoose / config / jwt       | 12.x                    | Use latest stable major                              |
| @nestjs/throttler                     | 6.x                     | Use latest stable major                              |
| mongoose                              | 9.x                     | Peer-compatible with `@nestjs/mongoose`              |
| ioredis                               | 6.x                     | Redis client mandated by the NestJS guide            |
| kafkajs                               | 2.2                     | Transport used by `@nestjs/microservices` Kafka      |
| next / react                          | 16.x / 19.x             | App Router                                           |
| @cucumber/cucumber                    | 13.x                    | E2E runner                                           |
| @playwright/test                      | 1.64                    | Browser + API automation                             |
| jest                                  | 30.x                    | Unit tests (all apps)                                |
| testcontainers                        | 12.x                    | Real MongoDB/Redis in integration tests              |
| typescript                            | 7.x (latest)            | See R-02                                             |

## R-01 Monorepo tooling

- **Decision**: pnpm workspaces (`apps/*`, `packages/*`, `end-to-end`) + Turborepo.
- **Rationale**: Mandated by project rules; Turbo gives cached `build/lint/typecheck/test` pipelines and
  `turbo prune --docker` for small, cache-friendly images.
- **Alternatives**: npm/yarn workspaces (violates `pnpm` rule); Nx (heavier, not requested).

## R-02 TypeScript version and strictness

- **Decision**: `strict: true` in `tsconfig.base.json`. Install the latest TypeScript major that
  `typescript-eslint`, `ts-jest`/SWC, Nest CLI and Next.js declare as supported; if TypeScript 7 is not
  yet supported by all of them, pin the newest supported 5.x/6.x release.
- **Rationale**: Constitution III requires zero TypeScript errors; an unsupported compiler would break
  lint or build tooling.
- **Alternatives**: Always pinning the newest compiler (risk of toolchain breakage).

## R-03 Runtime and package manager activation

- **Decision**: Node.js 24 LTS (`.nvmrc`, `engines`), pnpm via Corepack (`corepack enable`).
- **Rationale**: Node 24 and Corepack are present locally; `pnpm` itself is not installed, so the
  README and quickstart document Corepack activation.
- **Alternatives**: Global `npm i -g pnpm` (unpinned, drifts between machines).

## R-04 NestJS layout and persistence library

- **Decision**: Follow the guide's `common/ core/ modules/ shared/` shape and file naming
  (`*.controller.ts`, `*.module.ts`, `*.dto.ts`, `*.entity.ts`, `*.filter.ts`, …) and add hexagonal
  layers inside each module (`domain/ application/ infrastructure/ interface/`). Use `@nestjs/mongoose`
  - Mongoose instead of TypeORM (the guide's TypeORM section does not apply to MongoDB).
- **Rationale**: Satisfies the guide, Constitution I, and the MongoDB source-of-truth decision.
- **Alternatives**: Flat module files (violates hexagonal rule); Prisma/TypeORM (poor MongoDB fit).

## R-05 Hexagonal boundary and port placement rules (proposed, to fold into the architecture doc)

- Ports (interfaces such as `LeadRepositoryPort`, `CachePort`) are declared in the module's
  `domain/` (persistence ports) or `application/` (use-case-facing ports) layer and exposed via DI
  tokens.
- `domain/` has no framework imports; `application/` depends only on `domain/` and ports;
  `infrastructure/` implements ports (Mongoose, ioredis, Kafka); `interface/` (HTTP/Kafka) is thin and
  calls application use-cases only.
- Cross-module access goes through exported application services, never another module's
  infrastructure.
- **Rationale**: Closes the constitution's `TODO(PORT_PLACEMENT_RULES)` for this feature's structure.

## R-06 Configuration and fail-fast startup

- **Decision**: `@nestjs/config` with a typed, validated schema (class-validator or zod) evaluated at
  boot; missing/invalid variables abort startup and name the variable. `.env.example` documents all keys.
- **Rationale**: Spec FR-007 and the edge case for malformed config; no hard-coded environment values.
- **Alternatives**: Plain `process.env` reads (no validation).

## R-07 Redis resilience

- **Decision**: ioredis client created with a bounded retry strategy and `lazyConnect`; the health check
  reports Redis as `down` without crashing the app. The `CachePort` adapter swallows/logs Redis errors
  (read-through to DB is a later feature).
- **Rationale**: Architecture availability rule ("if Redis fails, read directly from the DB") and spec
  edge case.

## R-08 Health checks

- **Decision**: `@nestjs/terminus` in `HealthModule`; `GET /api/v1/health` returns
  `{ status, db, redis }` (matches the architecture doc). Background service exposes `GET /health`
  with `{ status, kafka, db }` on a separate port.
- **Alternatives**: Custom ad-hoc endpoint (re-implements Terminus indicators).

## R-09 Error contract

- **Decision**: One global `AllExceptionsFilter` maps any exception to `{ statusCode, message, error }`;
  the type and JSON Schema live in `packages/shared-contracts` and `contracts/error-response.schema.json`.
  Global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`) yields 400s in that shape.
- **Rationale**: Project rule "map errors consistently using shared error contracts".

## R-10 Web (Next.js 16) structure

- **Decision**: App Router under `src/app`, route groups `(auth)` and `(app)`, `lib/server` for
  server-only code (marked with `server-only`), React Query for client-side data in client components
  that call BFF route handlers, token stored only in an httpOnly cookie handled server-side. Cache
  Components enabled per guide (`cacheComponents: true`), Turbopack default, typed routes on, ESLint via
  CLI (not `next lint`). No demo/example files (guide §9).
- **Rationale**: Architecture doc ("lead-service called from server side (BFF)") and project rule that
  admin/internal API access is server-side only; project prioritises client-rendered content.
- **Verify at implementation**: Next 16 request-interception file naming (`proxy.ts` vs `middleware.ts`)
  against current Next.js docs, per guide §10.
- **Alternatives**: Pages router (discouraged); calling lead-service from the browser (exposes token).

## R-11 Styling

- **Decision**: Tailwind CSS 4 with the Next.js integration; no component library yet.
- **Rationale**: Minimal boilerplate; business UI is out of scope.
- **Alternatives**: CSS Modules only (viable, but Tailwind is the lower-effort default).

## R-12 Unit and integration testing

- **Decision**: Jest for all apps (matches architecture doc "Unit (Jest)"); `next/jest` + React Testing
  Library for web; Supertest + Testcontainers (MongoDB, Redis) for lead-service integration under a
  separate `test:integration` task so unit tests stay fast and Docker-free.
- **Rationale**: Constitution V (integration tests for REST/persistence); one runner reduces tooling.
- **Alternatives**: Vitest (adds a second runner), in-memory Mongo (does not match production).

## R-13 End-to-end testing

- **Decision**: `@cucumber/cucumber` for Gherkin features/steps; Playwright used as a library
  (`chromium` browser launch in a Cucumber `World`, `APIRequestContext` for service checks). Config in
  `cucumber.mjs`; TypeScript run via `tsx` loader; formatters `progress`, `html`, `json` written to
  `reports/`. Base URLs come from environment variables.
- **Rationale**: The request names Cucumber (Gherkin) and Playwright; the architecture doc names
  Playwright for E2E.
- **Alternatives**: `playwright-bdd` (generates Playwright Test files; deviates from "Cucumber
  framework" request).

## R-14 Docker and local environment

- **Decision**: Docker is already installed (Docker 29.x) — verify with `docker --version` and
  `docker compose version`. Multi-stage Dockerfile per app using `turbo prune <app> --docker`, `pnpm
install --frozen-lockfile`, non-root runtime user, `node:24-alpine` base (slim fallback if native
  deps require it), Next.js `output: 'standalone'`. Compose services: `mongo` (single-node replica set
  via `docker/mongo/init-replica.sh`), `redis`, `kafka` (Apache Kafka KRaft single node),
  `lead-service`, `lead-background-service`, `lead-web`, and an `e2e` profile service. Every service has
  a healthcheck; `depends_on.condition: service_healthy` gives ordered startup.
- **Rationale**: Spec FR-013 and edge case (backing services not ready on start).
- **Alternatives**: Standalone MongoDB (no transactions later); Zookeeper-based Kafka (extra container).

## R-15 CI/CD

- **Decision**: Two workflows. `ci.yml` (pull_request + push to main): pnpm via Corepack, Node 24,
  pnpm store + Turbo cache; steps install → format:check → lint → typecheck → build → test →
  test:integration; separate `e2e` job runs `docker compose up --build --wait`, executes the Cucumber
  suite, uploads reports, always tears down. `docker.yml` (push to main): `docker/build-push-action`
  matrix over the three apps, pushing to GHCR with `GITHUB_TOKEN` (`packages: write`); PRs build
  without push. Actions pinned to major versions; concurrency group cancels superseded runs.
- **Rationale**: Spec FR-014; Constitution III enforced automatically; project rule to keep `turbo.json`
  and CI in sync.
- **Alternatives**: Docker Hub (needs extra secrets); deploy step (no deploy target defined yet).

## R-16 Business scope

- No other feature spec exists in `specs/` yet. Business behavior is deferred to later feature specs
  built from `docs/system-design-architecture.md`; this plan builds structure only.
