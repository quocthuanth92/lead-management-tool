# Implementation Plan: Lead Management

**Branch**: `003-lead-management` | **Date**: 2026-10-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-lead-management/spec.md`

## Summary

Turn the `002-codebase-scaffolding` skeleton into the working lead management product described in the
spec: salesperson inbox, search/filter, lead details with automatic read tracking, single-label
classification, append-only follow-up activities, and lead ingestion from an internal API and from Kafka
events. Delivery follows six phases, each ending in a verifiable checkpoint:

1. **Database (code-first)**: a new `@lead/persistence` package holding the Mongoose schemas, indexes,
   shared cache-key helpers, and the single lead-writing adapter used by both backend apps.
2. **Contracts & DTOs**: extend `@lead/shared-contracts` with enums, limits, request/response types; both backends and the web reuse them.
3. **API logic**: lead-service use-cases per user story behind hexagonal ports (Mongo repositories,
   Redis cache-aside), thin controllers, JWT + API-key guards, minimal sign-in.
4. **Background service**: lead-background-service consumes `leads.incoming`, validates, retries,
   dead-letters, writes leads directly to MongoDB, invalidates Redis.
5. **UI**: lead-web inbox, search/filter, details/activity/label screens (client-rendered, React Query,
   BFF-only access to lead-service).
6. **Testing**: Jest unit tests per layer, Supertest + Testcontainers integration tests, and
   Cucumber + Playwright E2E against the compose environment (details in [test-plan.md](./test-plan.md)).

Design decisions are in [research.md](./research.md); data design in [data-model.md](./data-model.md);
interfaces in [contracts/](./contracts/).

## Technical Context

**Language/Version**: TypeScript (strict) on Node.js 24 LTS, as established by `002-codebase-scaffolding`
(TypeScript is pinned to 5.9.3 in the repo today).

**Primary Dependencies**: Already installed: NestJS 11 (`@nestjs/mongoose`, `@nestjs/jwt`,
`@nestjs/throttler`, `@nestjs/terminus`, `@nestjs/microservices`), Mongoose 8.19, ioredis 5.8,
class-validator/class-transformer, zod 3.25, kafkajs 2.2, Next.js 16 + React 19, `@tanstack/react-query`,
Tailwind 4 + shadcn/base-ui, Jest 30, Supertest, Testcontainers, Cucumber 12 + Playwright 1.56. New
(versions resolved at install time and checked against peer ranges): `@nestjs/schedule` and `ioredis` in
the background service, the `@lead/persistence` workspace package, `kafkajs` in `end-to-end` (to publish
test events), and a Kafka Testcontainers module for background-service integration tests.

**Storage**: MongoDB (source of truth; collections `users`, `leads`, `lead_activities`);
Redis (cache-aside for lists and details, per-user list version). Schemas are code-first (Mongoose).

**Testing**: Jest unit tests (all apps and packages); Supertest + Testcontainers (MongoDB, Redis, Kafka)
integration tests; Cucumber (Gherkin) + Playwright E2E (API scenarios via `APIRequestContext`, a few UI
journeys). Case matrix in [test-plan.md](./test-plan.md).

**Target Platform**: Linux containers (docker-compose environment from 002); desktop and tablet browsers.

**Project Type**: Monorepo web application: Next.js frontend, NestJS API, NestJS background worker,
shared packages, E2E project.

**Performance Goals**: Inbox and search p95 < 300 ms server-side at tens of thousands of leads (architecture
doc); users perceive results in < 2 s (SC-001, SC-002). Ingested leads visible within 1 minute (SC-006).

**Constraints**: APIs under `/api/v1`; errors as `{ statusCode, message, error }`; browser never receives
the access token (httpOnly cookie, BFF); no business logic in controllers/route handlers/UI; no PII in
logs; all configuration via validated environment variables; `limit` capped at 200.

**Scale/Scope**: Tens of thousands of leads, hundreds of concurrent salespeople; 9 REST endpoints, 1 Kafka
topic + 1 DLQ topic, 4 collections, 3 web screens (login, inbox, lead details), 1 new package.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                         | Gate                                                                                                                                                                                                       | Pre-research | Post-design                                  |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | -------------------------------------------- |
| I. Clean & Hexagonal Architecture | Domain has no framework imports; use-cases depend on ports; Mongo/Redis/Kafka only in infrastructure; controllers, Kafka handlers, route handlers and UI are thin; FE/BE separated; deviations are listed | PASS         | PASS (R-02, R-03, R-04, R-14)                |
| II. Verify Before Modification    | Existing scaffold inspected (leads placeholders, `CachePort`, consumer placeholder, BFF proxy, shared-contracts, compose Kafka) before planning changes                                                    | PASS         | PASS                                         |
| III. Code Quality Gates           | New package and tasks registered in `turbo.json` and CI; format, lint, type-check clean before commit                                                                                                      | PASS         | PASS (Step 1 wires `@lead/persistence`)      |
| IV. Skills-First Implementation   | `lead-service.instructions.md`, `lead-web.instructions.md`, `mongodb-schema-design`, `mongodb-query-optimizer` read; MongoDB connection skill and Next.js docs re-read when those layers are implemented     | PASS         | PASS                                         |
| V. Testing Policy                 | Unit tests for domain/application logic; integration tests for REST, persistence, security; E2E for primary flows ([test-plan.md](./test-plan.md))                                                         | PASS         | PASS                                         |
| Constraints                       | `pnpm`/`turbo`; `/api/v1`; request validation everywhere; no hard-coded config; spec exists                                                                                                                | PASS         | PASS                                         |

**Known tensions (resolved, no violation):**

- The architecture document names separate `LeadsModule` and `LeadActivitiesModule`. Activities cannot exist
  without their lead and every write touches the lead (`updatedAt`), so both live in one `leads` module
  with separate application services and controllers (the scaffold already did this).
- The architecture document says "get all leads by range date" without naming the field. The plan filters
  by `updatedAt` (last activity) so actively worked leads do not vanish after 6 months (R-05).
- The spec assumes sign-in already exists, but the scaffold only has a JWT skeleton. A minimal sign-in
  (login endpoint + seed command) is included as an enabling slice; user management stays out of scope.
- The architecture document proposes a text index for search; text indexes cannot do the partial,
  case-insensitive, phone-format-insensitive matching the spec requires (FR-006, FR-010). See R-06.

## Project Structure

### Documentation (this feature)

```text
specs/003-lead-management/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── test-plan.md         # Phase 1 output (unit / integration / E2E strategy and case matrix)
├── contracts/           # Phase 1 output
│   ├── lead-service.openapi.yaml
│   ├── lead-ingest-event.schema.json
│   ├── shared-contracts.md
│   ├── ui-layout.md
│   └── environment-variables.md
├── checklists/requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks, NOT created here)
```

### Source Code (repository root)

```text
packages/
├── shared-contracts/                    # @lead/shared-contracts: browser-safe (types, constants, zod)
│   └── src/
│       ├── api/constants.ts             # existing; + pagination/date-range defaults
│       ├── errors/error-response.ts     # existing
│       ├── leads/
│       │   ├── lead-label.ts            # LEAD_LABELS, LeadLabel
│       │   ├── activity-type.ts         # ACTIVITY_TYPES, ActivityType
│       │   ├── lead-source.ts           # LEAD_SOURCES (INTERNAL, EXTERNAL)
│       │   ├── limits.ts                # NOTE_MAX_LENGTH, SEARCH_*, PAGE_*, DEFAULT_RANGE_MONTHS
│       │   ├── lead.types.ts            # LeadListItem, LeadDetails, LeadActivityItem, PagedResult<T>
│       │   └── lead.requests.ts         # CreateLeadRequest, ListLeadsQuery, SetLabelRequest, AddActivityRequest
│       ├── auth/auth.types.ts           # LoginRequest, LoginResponse, SessionUser
│       └── index.ts
└── persistence/                         # NEW @lead/persistence: Node-only, never imported by lead-web
    ├── package.json  tsconfig.json  jest.config.cjs
    └── src/
        ├── schemas/                     # lead, lead-activity, user (code-first)
        ├── indexes.ts                   # index definitions + syncIndexes helper
        ├── normalization/               # phone, name/email search-field normalizers
        ├── cache/cache-keys.ts          # leads:{userId}:{version}:{hash}, lead:{id}, version key
        ├── ingestion/                   # LeadWriter: idempotent insert
        └── index.ts

apps/lead-service/src/
├── common/
│   ├── decorators/current-user.decorator.ts
│   ├── guards/                          # jwt-auth.guard.ts, api-key.guard.ts
│   └── filters/all-exceptions.filter.ts # existing
├── core/                                # config (+ new env keys), database (autoIndex flag), redis
├── modules/
│   ├── auth/                            # login use-case, PasswordHasherPort + scrypt adapter
│   ├── users/                           # UserRepositoryPort + Mongoose adapter (find by email)
│   ├── cache/                           # CachePort extended: get/set/del/incr
│   └── leads/
│       ├── domain/                      # entities (Lead, LeadActivity), value objects (DateRange, SearchTerm),
│       │                                #   ports: LeadRepositoryPort, LeadActivityRepositoryPort,
│       │                                #   LeadCachePort, LeadIngestionPort
│       ├── application/                 # CreateLead, ListLeads (inbox + search), GetLeadDetails, SetLeadLabel,
│       │                                #   AddLeadActivity, ListLeadActivities (use-case services)
│       ├── infrastructure/              # Mongoose repositories (via @lead/persistence), Redis lead cache
│       ├── interface/http/              # leads.controller.ts, lead-activities.controller.ts, dto/*
│       └── leads.module.ts
├── cli/seed.ts                          # dev/E2E seed: salespeople + sample leads
└── test/integration/                    # Supertest + Testcontainers

apps/lead-background-service/src/
├── core/config/                         # + REDIS_URL, retry/DLQ settings
└── modules/
    ├── lead-consumer/
    │   ├── domain/ports/                # DeadLetterPort, LeadIngestionPort, LeadCacheInvalidatorPort
    │   ├── application/                 # ProcessLeadEvent (validate → ingest → invalidate), retry policy
    │   ├── infrastructure/              # Kafka DLQ producer, LeadWriter adapter, Redis invalidation adapter
    │   │   └── events/lead-ingest-event.ts  # zod schema + LeadIngestEvent type + DLQ envelope type    
    │   └── interface/kafka/             # lead-consumer.handler.ts (thin)

apps/lead-web/src/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (app)/layout.tsx                 # header (user, sign out)
│   ├── (app)/leads/page.tsx             # inbox
│   ├── (app)/leads/[id]/page.tsx        # details
│   └── api/
│       ├── auth/login|logout/route.ts   # sets/clears httpOnly cookie (thin)
│       └── lead-service/route.ts  # hardened allowlist proxy: cookie → Bearer
├── components/leads/                    # InboxToolbar, LeadTable, LabelBadge, Pagination, DateRangeFilter,
│                                        #   LeadDetailsCard, LabelSelect, ActivityComposer, ActivityTimeline
├── hooks/                               # useLeads, useLeadDetails, useSetLabel, useAddActivity, useDebounce
├── lib/server/                          # lead-service client, session helpers (existing)
└── lib/query/                           # query keys + client (existing)

end-to-end/
├── features/leads/                      # inbox, search, details-read, label, activity, ingestion-api,
│                                        #   ingestion-kafka, access-control, ui-journey (.feature)
├── step-definitions/leads/
└── support/                             # api-client (login helper), kafka-publisher, seed-data helpers
```

**Structure Decision**: Keep the 002 layout and hexagonal rules. One new package (`@lead/persistence`) exists
only because two deployables must write to the same collections with identical schemas, indexes which remains free of Node, Mongoose, and Nest dependencies.

## Delivery Sequence

| #   | Step                | Outputs                                                                                                                                                                              | Checkpoint                                                                                                                  |
| --- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| 1   | Code-first database | `@lead/persistence` (schemas, indexes, normalizers, cache keys, LeadWriter); label/type/limit constants in shared-contracts; `turbo.json` + CI wiring; seed command                    | `pnpm --filter @lead/persistence test`; integration test proves indexes exist and `explain` for the inbox query uses an index |
| 2   | Contracts & DTOs    | Remaining shared-contracts types, requests, event schema; OpenAPI + event JSON Schema kept in sync (parity test); lead-service DTO classes implementing the shared request types      | shared-contracts unit tests; both backends and the web compile against it                                                   |
| 3   | API logic per story | Auth + guards; US6 ingest API, US1 inbox, US2 details/read, US4 label, US3 activities, US5 search; cache-aside + invalidation; thin controllers                                        | unit tests per use-case; Supertest integration suite green (TC-01 … TC-15)                                                  |
| 4   | Background service  | Kafka consumer, validation, retry, DLQ, direct writes, Redis invalidation                                                                                         | consumer unit tests; Kafka + Mongo Testcontainers integration (TC-12, DLQ)                            |
| 5   | UI                  | Login, inbox (search, label filter, date range, pagination), details (label, activity composer, timeline), hardened BFF proxy; loading / empty / error states                        | RTL tests; manual check against [ui-layout.md](./contracts/ui-layout.md); no token in the browser bundle                    |
| 6   | Tests & E2E         | Unit gaps closed, integration suite, Cucumber features for APIs + UI journey, CI jobs updated                                                                                         | `pnpm test`, `pnpm test:integration`, `pnpm test:e2e` green against the compose environment                                |

Story-to-endpoint mapping inside Step 3 (build in this order; each slice is independently testable):

| Spec story              | Endpoint(s)                                  | Key rules (FR)         |
| ----------------------- | -------------------------------------------- | ---------------------- |
| Enabling: sign-in       | `POST /api/v1/auth/login`                    | FR-031                 |
| US6 Ingestion (API)     | `POST /api/v1/leads` (`x-api-key`)           | FR-024, FR-026–FR-028  |
| US1 Inbox               | `GET /api/v1/leads`                          | FR-001–FR-005          |
| US2 Details + mark read | `GET /api/v1/leads/:id`                      | FR-011–FR-014          |
| US4 Label               | `PUT /api/v1/leads/:id/label`                | FR-015–FR-017          |
| US3 Activities          | `POST`/`GET /api/v1/leads/:id/activities`    | FR-018–FR-023          |
| US5 Search & filter     | `GET /api/v1/leads/search`                   | FR-006–FR-010          |

Deliberately not built: `PUT /leads/:id/view` from the architecture doc (no requirement to mark a lead
unread), admin all-leads access, k6 performance tests (TC-16).

## Complexity Tracking

| Item                               | Why Needed                                                                                    | Simpler Alternative Rejected Because                                                                  |
| ---------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| New package `@lead/persistence`    | Two apps write `leads`; schema, indexes and de-duplication must not drift         | Duplicating schemas in both apps invites drift; routing the consumer via lead-service contradicts the architecture |
| Minimal sign-in in this feature    | The UI and E2E need an authenticated salesperson; the scaffold has no login                   | Skipping it leaves every endpoint untestable end-to-end                                               |
| Redis client in background service | Architecture requires the consumer to invalidate list and detail caches after writes          | Relying on TTLs alone would show stale inboxes for up to 60 s and stale details for up to 5 min       |
