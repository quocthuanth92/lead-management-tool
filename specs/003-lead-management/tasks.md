# Tasks: Lead Management

**Input**: Design documents from `/specs/003-lead-management/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [test-plan.md](./test-plan.md), [quickstart.md](./quickstart.md)

**Tests**: Included. Constitution V makes tests mandatory for domain/application behavior and integration tests mandatory for REST, persistence, and security changes. Within each phase, write the test tasks first and confirm they fail before implementing.

**Organization**: Ordered as requested: **database → shared packages → backend platform → backend APIs (per user story, including the Kafka consumer) → frontend → E2E → polish**. Backend story phases are independently testable through the API alone; no frontend task is started before the backend checkpoint (Phase 12).

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1 Inbox · US2 Details · US3 Activity · US4 Label · US5 Search · US6 Ingestion (see spec.md)
- Paths are relative to the repo root. Run `pnpm format:check; pnpm lint; pnpm typecheck` before each commit (Constitution III).
- Load the relevant skills/instructions before touching a layer (Constitution IV): `.github/instructions/lead-service.instructions.md` and `.agents/skills/mongodb-*` for backend/DB, `.github/instructions/lead-web.instructions.md` for web.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Workspace wiring so later phases compile, build in order, and run in pnpm.

- [x] T001 Create the `@lead/persistence` package skeleton in `packages/persistence/` (`package.json` named `@lead/persistence`, `"type": "commonjs"`, `main: dist/index.js`, `types: dist/index.d.ts`, scripts `build`, `lint`, `typecheck`, `test`, `test:integration` mirroring `packages/shared-contracts/package.json`; dependencies `mongoose` 8.19.1 and `@lead/shared-contracts` `workspace:*`; devDependencies `testcontainers` 11.7.2, `jest`, `ts-jest`, `typescript` at the versions already used in the repo; `tsconfig.json` extending `tsconfig.base.json`; `jest.config.cjs` for `src/**/*.spec.ts`; `jest.integration.config.cjs` for `test/**/*.int-spec.ts`; empty `src/index.ts`)
- [x] T002 Add `zod` 3.25.76 to `packages/shared-contracts/package.json`; add `@lead/persistence` as `workspace:*` to `apps/lead-service/package.json` and `apps/lead-background-service/package.json`; run `pnpm install` and commit the lockfile
- [x] T003 [P] Add new dependencies: `@nestjs/schedule` and `ioredis` 5.8.2 to `apps/lead-background-service/package.json`; `kafkajs` 2.2.4 to `end-to-end/package.json`; a Kafka Testcontainers module (resolve the latest version compatible with `testcontainers` 11.7.2 at install time) to `apps/lead-background-service/package.json` devDependencies; run `pnpm install`
- [x] T004 Update `turbo.json` so `test` also depends on `^build` (apps resolve `@lead/shared-contracts` and `@lead/persistence` from `dist`), keep `test:integration` depending on `build`, and confirm with `pnpm turbo run test --dry=json` that `@lead/shared-contracts` and `@lead/persistence` build before app tests
- [x] T005 [P] Update `apps/lead-service/Dockerfile` and `apps/lead-background-service/Dockerfile` so `turbo prune` output includes `packages/persistence` and `packages/shared-contracts`, and verify with `docker build` for both images
- [x] T006 [P] Add the new environment keys from `specs/003-lead-management/contracts/environment-variables.md` to `apps/lead-service/.env.example`, `apps/lead-background-service/.env.example` (including required `REDIS_URL`), `apps/lead-web/.env.example`, `end-to-end/.env.example`, and to the service definitions in `docker-compose.yml` (background service gets `REDIS_URL` and a Redis `depends_on`)

**Checkpoint**: `pnpm install` and `pnpm build` succeed with the new empty package; both Docker images build.

---

## Phase 2: Database (Code-First) — Foundational A

**Purpose**: Mongoose schemas, indexes, normalizers, cache keys, and the shared lead writer in `@lead/persistence` ([data-model.md](./data-model.md), research R-02, R-03, R-06, R-07).

**⚠️ CRITICAL**: Everything after this phase depends on it.

### Constants consumed by the schemas (minimal subset of the shared-contracts work)

- [x] T007 [P] Add `packages/shared-contracts/src/leads/lead-label.ts` (`LEAD_LABELS = ['UNLABELED','POTENTIAL','SPAM'] as const`, `LeadLabel`, `DEFAULT_LEAD_LABEL = 'UNLABELED'`), `activity-type.ts` (`ACTIVITY_TYPES = ['CALL','EMAIL','SMS','NOTE','OTHER'] as const`, `ActivityType`, `DEFAULT_ACTIVITY_TYPE = 'NOTE'`), `lead-source.ts` (`LEAD_SOURCES = ['INTERNAL','EXTERNAL'] as const`, `ASSIGNMENT_STATUSES = ['ASSIGNED','UNASSIGNED'] as const`), and `limits.ts` (`LIMITS`: `FULL_NAME_MAX=120, PHONE_MIN_DIGITS=7, PHONE_MAX_DIGITS=20, EMAIL_MAX=254, MESSAGE_MAX=2000, NOTE_MAX=2000, SEARCH_MIN=2, SEARCH_MAX=100`; `PAGINATION`: `DEFAULT_PAGE=1, DEFAULT_LIMIT=20, MAX_LIMIT=200, ACTIVITIES_IN_DETAILS=50`; `DEFAULT_RANGE_MONTHS=6`; `KAFKA_TOPICS`: `LEADS_INCOMING='leads.incoming'`, `LEADS_DLQ='leads.incoming.dlq'`); export all from `packages/shared-contracts/src/index.ts`

### Tests (write first)

- [x] T008 [P] Unit tests for normalizers in `packages/persistence/src/normalization/normalization.spec.ts`: phone (spaces, dashes, parentheses, leading `+`, `00` prefix → `+`, fewer than 7 or more than 20 digits rejected), name folding (case, diacritics, `đ → d`, whitespace collapsed), email lower-casing, derived `phoneDigits`
- [x] T009 [P] Unit tests for cache keys in `packages/persistence/src/cache/cache-keys.spec.ts`: `leads:{userId}:{version}:{sha1(q)}` identical for equal queries regardless of parameter order, different for different users/versions; `lead:{id}`; `leads:version:{userId}`
- [x] T010 [P] Unit tests for `LeadWriter` in `packages/persistence/src/ingestion/lead-writer.spec.ts` using a fake `LeadWriterStore`: round-robin order across 3 active salespeople ordered by `_id` and wrap-around; inactive users skipped; no salespeople → `UNASSIGNED` and no `userId`; concurrent assignments never reuse a sequence slot; duplicate `externalEventId` (store throws duplicate-key) → result `{ duplicate: true }`; new lead defaults `hasView=false`, `label='UNLABELED'`, `updatedAt = createdAt`
- [x] T011 [P] Integration tests (Testcontainers MongoDB) in `packages/persistence/test/schemas.int-spec.ts`: all indexes from data-model.md exist with the exact keys/options; unique `externalEventId` partial index rejects a second lead with the same id but allows many leads without it; unique `users.email`; **TC-17**: `explain` of the inbox query (`{ userId, updatedAt: { $gte, $lte } }` sorted by `{ hasView: 1, updatedAt: -1 }`) uses the `{ userId: 1, hasView: 1, updatedAt: -1 }` index with no `COLLSCAN` and no in-memory `SORT`; counter `$inc` under 50 concurrent calls yields 50 distinct values

### Implementation

- [x] T012 [P] Implement normalizers in `packages/persistence/src/normalization/phone.ts`, `search-fields.ts` (returns `fullNameSearch`, `emailLower`, `phoneDigits`) and `index.ts`, using `LIMITS` from `@lead/shared-contracts` (phone stored as "digits with optional leading `+`, 7–20 digits")
- [x] T013 [P] Implement cache-key builders in `packages/persistence/src/cache/cache-keys.ts` (`leadListKey(userId, version, query)`, `leadKey(id)`, `leadsVersionKey(userId)`; `sha1` over a canonical JSON of the query)
- [x] T014 [P] Define the `users` schema in `packages/persistence/src/schemas/user.schema.ts`: `email` string required, unique, stored lower-case; `passwordHash` string required (`scrypt$<salt>$<hash>`, never returned); `fullName` string required, 1–120 chars; `role` enum `SALESPERSON` (default) | `ADMIN`; `isActive` boolean default `true`; `createdAt`, `updatedAt` Dates; index `{ email: 1 }` unique
- [x] T015 [P] Define the `leads` schema in `packages/persistence/src/schemas/lead.schema.ts` exactly per data-model.md §2: `userId` ObjectId ref `users` (absent while `UNASSIGNED`); `assignmentStatus` enum `ASSIGNED` | `UNASSIGNED`; `fullName` required, 1–120 chars, trimmed; `phone` required, normalized, 7–20 digits; `email` optional, valid format, ≤ 254 chars; `message` required, 1–2000 chars; `source` enum `INTERNAL` | `EXTERNAL`; `label` enum `UNLABELED` (default) | `POTENTIAL` | `SPAM`; `hasView` boolean default `false`; derived `fullNameSearch`, `emailLower`, `phoneDigits`; `externalEventId` optional string; `schemaVersion` number default `1`; `createdAt`, `updatedAt` set explicitly (Mongoose `timestamps` NOT used for `updatedAt`); enums come from `@lead/shared-contracts`
- [x] T016 [P] Define the `lead_activities` schema in `packages/persistence/src/schemas/lead-activity.schema.ts`: `leadId` ObjectId required; `userId` ObjectId required; `authorName` string (denormalized); `type` enum `CALL` | `EMAIL` | `SMS` | `NOTE` (default) | `OTHER`; `content` required, trimmed, 1–2000 chars, non-whitespace; `createdAt` Date set once at insert; no `updatedAt`, no update hooks
- [x] T017 [P] Define the `counters` schema in `packages/persistence/src/schemas/counter.schema.ts` (`_id` string key, `seq` number) used by key `lead-assignment`
- [x] T018 Declare all indexes in `packages/persistence/src/indexes.ts` and attach them to the schemas: `leads { userId: 1, hasView: 1, updatedAt: -1 }`; `leads { externalEventId: 1 }` unique partial `{ externalEventId: { $type: 'string' } }`; `leads { createdAt: 1 }` partial `{ assignmentStatus: 'UNASSIGNED' }`; `lead_activities { leadId: 1, createdAt: -1 }`; `users { email: 1 }` unique; export `syncAllIndexes(connection)` (depends on T014–T017)
- [x] T019 Implement `LeadWriter` and its `LeadWriterStore` port in `packages/persistence/src/ingestion/lead-writer.ts`, plus the Mongoose-backed `MongoLeadWriterStore` in `mongo-lead-writer.store.ts` (atomic `findOneAndUpdate({ $inc }, { upsert: true, new: true })` counter; active salespeople = `{ role: 'SALESPERSON', isActive: true }` sorted by `_id`; insert maps Mongo duplicate-key error code 11000 on `externalEventId` to `{ duplicate: true }`; `assignHeld(leadId, userId)` conditional update on `assignmentStatus = 'UNASSIGNED'`); exposes `writeLead(input, { source, externalEventId? })` returning `{ id, userId?, duplicate }` (depends on T012, T015, T017)
- [x] T020 Export schemas, `syncAllIndexes`, normalizers, cache keys, and `LeadWriter` from `packages/persistence/src/index.ts`; run `pnpm --filter @lead/persistence build test test:integration` until T008–T011 pass

### Wire the databases into the apps

- [x] T021 [P] Update `apps/lead-service/src/core/config/env.schema.ts` (add `MONGODB_SYNC_INDEXES` boolean defaulting to `true` unless `NODE_ENV=production`, `CACHE_LIST_TTL_SECONDS` default 60, `CACHE_LEAD_TTL_SECONDS` default 300) and `apps/lead-service/src/core/database/database.module.ts` (call `syncAllIndexes` on connection when the flag is true; register the `@lead/persistence` schemas for injection); update `config-validation.e2e-spec.ts` for the new keys
- [x] T022 [P] Update `apps/lead-background-service/src/core/config/env.schema.ts` (add `REDIS_URL` required url, `CONSUMER_RETRY_ATTEMPTS` default 3, `CONSUMER_RETRY_DELAY_MS` default 1000, `ASSIGN_HELD_LEADS_INTERVAL_SECONDS` default 30, `ASSIGN_HELD_LEADS_BATCH_SIZE` default 100) and create `apps/lead-background-service/src/core/database/database.module.ts` (`MongooseModule.forRootAsync`, registers `@lead/persistence` schemas, no index sync); import it in `apps/lead-background-service/src/app.module.ts`

**Checkpoint**: `pnpm --filter @lead/persistence test test:integration` green (including TC-17 index/explain); both apps start and connect with their new env schemas.

---

## Phase 3: Shared Packages (Contracts & DTO Types) — Foundational B

**Purpose**: Complete `@lead/shared-contracts` so backend, background service, web, and E2E share one typed contract ([contracts/shared-contracts.md](./contracts/shared-contracts.md)).

### Tests (write first)

- [x] T023 [P] Unit tests for the event schema in `packages/shared-contracts/src/events/lead-ingest-event.spec.ts`: valid event; each missing required field (`schemaVersion`, `eventId`, `occurredAt`, `lead.fullName`, `lead.phone`, `lead.message`); non-UUID `eventId`; `schemaVersion` ≠ 1; `fullName` > 120, `message` > 2000, `phone` outside 7–25 raw characters; invalid `email`; unknown keys rejected; `parseLeadIngestEvent` issues contain paths/messages and never the offending input values
- [x] T024 [P] Parity test in `packages/shared-contracts/src/contracts.parity.spec.ts` that loads `specs/003-lead-management/contracts/lead-service.openapi.yaml` and `lead-ingest-event.schema.json` (add `yaml` as a devDependency) and asserts enums, limits (`maxLength`, `maximum: 200`, `minLength`), and `required` lists equal `LEAD_LABELS`, `ACTIVITY_TYPES`, `LEAD_SOURCES`, `LIMITS`, `PAGINATION`

### Implementation

- [x] T025 [P] Add response/list types in `packages/shared-contracts/src/leads/lead.types.ts`: `PagedResult<T>`, `LeadListItem` (`id, customerName, email?, phone, label, hasView, lastUpdate`), `LeadActivityItem` (`id, leadId, type, content, authorName, createdAt`), `LeadDetails` (list fields + `source, message, createdAt, activities, activitiesTotal`), `SetLabelResponse`, `CreateLeadResponse`; dates are ISO strings
- [x] T026 [P] Add request types in `packages/shared-contracts/src/leads/lead.requests.ts`: `CreateLeadRequest`, `ListLeadsQuery`, `SearchLeadsQuery` (at least one of `q`/`label`), `SetLabelRequest`, `AddActivityRequest`
- [x] T027 [P] Add auth types in `packages/shared-contracts/src/auth/auth.types.ts`: `LoginRequest`, `LoginResponse`, `SessionUser` (`id, email, fullName, role`)
- [x] T028 Implement the event contract in `packages/shared-contracts/src/events/lead-ingest-event.ts`: `leadIngestEventSchema` (zod, strict, built from `LIMITS`), `LeadIngestEvent`, `parseLeadIngestEvent(raw)` returning `{ success: true, data } | { success: false, issues: string[] }` without echoing values, and the `DeadLetterEnvelope` type matching `contracts/lead-ingest-event.schema.json`
- [x] T029 Export everything from `packages/shared-contracts/src/index.ts`, extend `packages/shared-contracts/src/index.spec.ts` for constants (`MAX_LIMIT = 200`, `DEFAULT_RANGE_MONTHS = 6`), and run `pnpm --filter @lead/shared-contracts build lint typecheck test` until T023–T024 pass

**Checkpoint**: shared-contracts and persistence build; both backends and `lead-web` can import the new types (`pnpm typecheck`).

---

## Phase 4: Backend Platform (lead-service Foundation) — Foundational C

**Purpose**: Everything every lead endpoint needs: authentication, ownership identity, validation helpers, cache port, domain ports, integration harness. Includes the minimal sign-in slice (plan: Complexity Tracking, research R-10, R-11, R-14).

### Tests (write first)

- [x] T030 [P] Unit tests in `apps/lead-service/src/modules/auth/application/auth.service.spec.ts`: correct credentials → token with `sub` and `role`; wrong password and unknown email return the identical `UnauthorizedException`; inactive user rejected; password verification is constant-time (`timingSafeEqual`) and handles malformed hashes
- [x] T031 [P] Unit tests in `apps/lead-service/src/modules/auth/infrastructure/scrypt-password-hasher.spec.ts` (hash format `scrypt$<salt>$<hash>`, unique salt, verify true/false) and `apps/lead-service/src/common/guards/jwt-auth.guard.spec.ts` / `api-key.guard.spec.ts` (missing, malformed, expired, tampered token → 401; `x-api-key` missing/wrong/length-mismatch → 401; correct key passes; compare is constant-time)
- [x] T032 [P] Unit tests in `apps/lead-service/src/modules/cache/infrastructure/adapters/redis-cache.adapter.spec.ts` for the extended `CachePort` (`get`, `set` with TTL, `del`, `incr`, Redis errors swallowed and logged without values) and in `apps/lead-service/src/modules/leads/infrastructure/cache/redis-lead.cache.spec.ts` for `LeadCachePort` (list page get/set with version key, lead get/set, `invalidateLead`, `invalidateUserLists` increments version, Redis failure → miss/no-throw)

### Implementation

- [x] T033 Extend `apps/lead-service/src/modules/cache/domain/ports/cache.port.ts` with `del(key)`, `incr(key)`, `getNumber(key)` and implement them in `redis-cache.adapter.ts` (all failures logged by key only and tolerated)
- [x] T034 Replace the placeholder domain in `apps/lead-service/src/modules/leads/domain/`: rewrite `entities/lead.entity.ts` (id, userId, customerName, phone, email?, message, source, label, hasView, createdAt, updatedAt) and `entities/lead-activity.entity.ts` (id, leadId, userId, authorName, type, content, createdAt); declare ports `ports/lead-repository.port.ts`, `ports/lead-activity-repository.port.ts` (**only `add` and `list`; no update/delete**), `ports/lead-cache.port.ts`, `ports/lead-ingestion.port.ts` with DI tokens; domain files have no framework imports
- [x] T035 Implement `LeadCachePort` in `apps/lead-service/src/modules/leads/infrastructure/cache/redis-lead.cache.ts` using `@lead/persistence` cache-key builders and `CACHE_LIST_TTL_SECONDS` / `CACHE_LEAD_TTL_SECONDS` (list TTL 60 s, lead TTL 300 s); `lead:{id}` payload includes `userId` for the ownership check on hit
- [x] T036 [P] Implement `apps/lead-service/src/modules/users/` — `domain/ports/user-repository.port.ts` (`findByEmail`, `findById`), `infrastructure/mongoose-user.repository.ts` (via `@lead/persistence` user schema), `users.module.ts` exporting the port
- [x] T037 [P] Implement `apps/lead-service/src/modules/auth/` — `domain/ports/password-hasher.port.ts`, `infrastructure/scrypt-password-hasher.ts` (Node `crypto.scrypt`, format `scrypt$<salt>$<hash>`), `application/auth.service.ts` (`login(email, password)` → `LoginResponse`), `interface/http/auth.controller.ts` (`POST /api/v1/auth/login`, thin) with `dto/login.dto.ts` (`email` valid format, `password` 1–200 chars), wire in `auth.module.ts` (depends on T036)
- [x] T038 [P] Implement `apps/lead-service/src/common/guards/jwt-auth.guard.ts` (verifies bearer token via `JwtService`, attaches `{ userId, role }`; replaces the placeholder `apps/lead-service/src/modules/auth/guards/auth.guard.ts`), `apps/lead-service/src/common/guards/api-key.guard.ts` (`x-api-key` vs `LEAD_SOURCE_API_KEY` with `timingSafeEqual`), and `apps/lead-service/src/common/decorators/current-user.decorator.ts`
- [x] T039 Register `ThrottlerGuard` as a global `APP_GUARD` in `apps/lead-service/src/app.module.ts` if not already applied (limits from `RATE_LIMIT_TTL`/`RATE_LIMIT_LIMIT`), and add a stricter throttle override on `POST /auth/login`
- [x] T040 Implement the seed command `apps/lead-service/src/cli/seed.ts` (builds to `dist/src/cli/seed.js`; add `"seed": "node dist/src/cli/seed.js"` to `apps/lead-service/package.json`): idempotently creates two active salespeople A and B (emails/password from env `E2E_USER_A_EMAIL`, `E2E_USER_B_EMAIL`, `SEED_SALESPERSON_PASSWORD`; scrypt-hashed) and optional sample leads/activities via `--with-samples`; prints emails only (depends on T037)
- [x] T041 Extend the integration harness `apps/lead-service/test/integration/test-app.factory.ts`: apply the global pipes/filter/prefix the same way `main.ts` does, expose `login(email, password)`, `createSalesperson(overrides)`, `seedLead(overrides)`, `seedActivity(...)`, and `stopRedis()/startRedis()`; unique emails/phones per test; reuse containers per suite
- [x] T042 [P] Integration tests `apps/lead-service/test/integration/auth.e2e-spec.ts`: login success/failure shape (`{ statusCode, message, error }`), missing/expired/tampered JWT → 401 on a protected probe route (**TC-15**), `x-api-key` ignored on JWT routes, throttle exceeded → 429 (**TC-19**), password hash never in any response

**Checkpoint**: unit + integration tests for auth/cache pass; `pnpm --filter lead-service seed` creates users; a login returns a usable token.

---

## Phase 5: US6 — Lead Ingestion via Internal API (Priority: P1) 🎯 first data source

**Goal**: A trusted internal system can submit a lead; it is stored unread, unlabeled, source `INTERNAL`, assigned (or held).

**Independent Test**: `POST /api/v1/leads` with and without the API key; verify document in MongoDB (quickstart scenario 1).

### Tests (write first)

- [x] T043 [P] [US6] Unit tests `apps/lead-service/src/modules/leads/application/create-lead.service.spec.ts`: delegates to `LeadIngestionPort` with source `INTERNAL`; returns `{ id }`; invalidates the assignee's list cache when assigned, nothing when held; logs contain only ids (assert no name/phone/email/message in captured log output, **TC-18**)
- [x] T044 [P] [US6] DTO validation tests `apps/lead-service/src/modules/leads/interface/http/dto/create-lead.dto.spec.ts` via `ValidationPipe`: missing `fullName`/`phone`/`message` → 400; `fullName` > 120, `message` > 2000, invalid `email`, `phone` with fewer than 7 or more than 20 digits, extra property → 400; formatted phone accepted
- [x] T045 [P] [US6] Integration tests `apps/lead-service/test/integration/ingest-api.e2e-spec.ts` — **TC-11**: valid `POST` with key → 201, document is unread/`UNLABELED`/`INTERNAL`/`ASSIGNED`; wrong or missing key → 401 with no document; invalid body → 400; same body twice → two distinct leads; **TC-11b**: zero active salespeople → 201 stored `UNASSIGNED` and invisible to all users; assignment alternates between two salespeople

### Implementation

- [x] T046 [US6] Implement `LeadIngestionPort` adapter `apps/lead-service/src/modules/leads/infrastructure/mongoose-lead-ingestion.adapter.ts` wrapping `@lead/persistence` `LeadWriter`/`MongoLeadWriterStore`
- [x] T047 [US6] Implement `apps/lead-service/src/modules/leads/application/create-lead.service.ts` (write via port, invalidate assignee list cache, id-only logging)
- [x] T048 [US6] Implement `apps/lead-service/src/modules/leads/interface/http/dto/create-lead.dto.ts` (class-validator; `implements CreateLeadRequest`; limits from `LIMITS`) and replace the placeholder in `leads.controller.ts` with `POST /api/v1/leads` guarded by `ApiKeyGuard`, returning 201 `{ id }`; delete `dto/create-placeholder-lead.dto.ts`, `leads.service.ts` placeholder method, and `MongooseLeadRepository.createPlaceholder`
- [x] T049 [US6] Wire `LeadsModule` providers (`apps/lead-service/src/modules/leads/leads.module.ts`) for the new adapters/services; run T043–T045 until green

**Checkpoint**: Internal API ingestion works end to end; seeded users can later see the leads.

---

## Phase 6: US6 — Lead Ingestion via Kafka Events (Priority: P1) — Background service

**Goal**: Valid external events become leads exactly once; invalid/failed events are dead-lettered; held leads get assigned.

**Independent Test**: Publish events to `leads.incoming` and observe MongoDB and the DLQ (quickstart scenarios 2–3).

### Tests (write first)

- [ ] T050 [P] [US6] Unit tests `apps/lead-background-service/src/modules/lead-consumer/application/process-lead-event.service.spec.ts` with fake ports: valid → ingest (`EXTERNAL`, `externalEventId = eventId`) → invalidate; duplicate → acknowledged with no invalidation and no error; invalid payload → DLQ immediately with reason `INVALID_PAYLOAD` and no retry; transient failure → retried with exponential backoff (fake timers) then DLQ `PROCESSING_FAILED` after `CONSUMER_RETRY_ATTEMPTS`; success on a later attempt; DLQ publish failure rethrows; Redis invalidation failure ignored; logs contain only ids/counts (**TC-18**)
- [ ] T051 [P] [US6] Unit tests `apps/lead-background-service/src/modules/lead-assignment/application/assign-held-leads.service.spec.ts`: oldest first up to `ASSIGN_HELD_LEADS_BATCH_SIZE`; lost race (conditional update matches nothing) is skipped; no salespeople → no-op; invalidates the assignee's cache
- [ ] T052 [P] [US6] Handler test `apps/lead-background-service/src/modules/lead-consumer/interface/kafka/lead-consumer.handler.spec.ts`: thin delegation, passes message key/value/topic/partition/offset, topic comes from validated config
- [ ] T053 [P] [US6] Integration tests (Testcontainers MongoDB + Redis + Kafka) `apps/lead-background-service/test/integration/consumer.int-spec.ts` — **TC-12**: valid event → one `EXTERNAL` lead; same event twice → exactly one lead; two salespeople → round-robin; **TC-12b**: invalid payload and non-JSON poison message → no lead, one DLQ envelope each, consumer still processes the next message; **TC-12c**: Mongo unavailable then available → retried then success (or DLQ after attempts); **TC-12d**: no salespeople, event stored `UNASSIGNED`, then a salesperson is created → assigned within one scheduler interval; add `test:integration` script and `test/jest-integration.config.cjs` to `apps/lead-background-service/`

### Implementation

- [ ] T054 [P] [US6] Define ports in `apps/lead-background-service/src/modules/lead-consumer/domain/ports/`: `lead-ingestion.port.ts`, `dead-letter.port.ts`, `lead-cache-invalidator.port.ts` (replace the placeholder `lead-event.port.ts`)
- [ ] T055 [P] [US6] Implement infrastructure adapters in `apps/lead-background-service/src/modules/lead-consumer/infrastructure/`: `mongo-lead-ingestion.adapter.ts` (uses `@lead/persistence` `LeadWriter`), `kafka-dead-letter.producer.ts` (kafkajs producer publishing a `DeadLetterEnvelope` to `KAFKA_LEADS_DLQ_TOPIC`), `redis-cache-invalidator.adapter.ts` (`DEL lead:{id}`, `INCR leads:version:{userId}`, failures logged and swallowed), `redis.module.ts`
- [ ] T056 [US6] Implement `apps/lead-background-service/src/modules/lead-consumer/application/process-lead-event.service.ts` and `retry-policy.ts` (reads attempts/delay from config; replaces `infrastructure/retry/consumer-retry.policy.ts` constants and the placeholder `lead-consumer.service.ts`)
- [ ] T057 [US6] Rewrite `apps/lead-background-service/src/modules/lead-consumer/interface/kafka/lead-consumer.handler.ts` to read the raw message (key, value, topic, partition, offset), call `ProcessLeadEvent`, and rely on offset commit only after success/ack/DLQ (no `Date.now()`-derived ids); take the topic from `ConfigService` instead of `process.env` at decoration time; update `lead-consumer.module.ts`
- [ ] T058 [US6] Implement `apps/lead-background-service/src/modules/lead-assignment/` — `application/assign-held-leads.service.ts`, `infrastructure/held-leads-scheduler.ts` (`@nestjs/schedule` interval from `ASSIGN_HELD_LEADS_INTERVAL_SECONDS`), `lead-assignment.module.ts`; register `ScheduleModule.forRoot()` and the modules in `apps/lead-background-service/src/app.module.ts`; extend the health service to report `redis`
- [ ] T059 [US6] Run T050–T053 until green; verify with `docker compose up --build --wait` that the service consumes a manually published event (quickstart scenarios 2–3)

**Checkpoint**: Both ingestion sources work; duplicates and invalid events behave per FR-029/FR-030.

---

## Phase 7: US1 — Lead Inbox, backend (Priority: P1)

**Goal**: A salesperson lists only their leads, unread first then newest update, default last 6 months, paginated.

**Independent Test**: Seed leads for A and B with mixed age/read state, `GET /api/v1/leads` as A (TC-01–TC-03).

### Tests (write first)

- [ ] T060 [P] [US1] Unit tests `apps/lead-service/src/modules/leads/domain/value-objects/date-range.spec.ts`: default = `[now − 6 months, now]` (injectable clock); date-only `toDate` inclusive to end of day (UTC); `fromDate > toDate` rejected; garbage dates rejected
- [ ] T061 [P] [US1] Unit tests `apps/lead-service/src/modules/leads/application/list-leads.service.spec.ts` (inbox mode): uses only the caller's `userId`; default range/page 1/limit 20; `limit` > 200 rejected; sort spec = `{ hasView: 1, updatedAt: -1, _id: -1 }`; cache hit skips the repository; miss populates cache with TTL; Redis error falls back to the repository; `total` returned
- [ ] T062 [P] [US1] DTO tests `apps/lead-service/src/modules/leads/interface/http/dto/list-leads-query.dto.spec.ts`: `page=0`, `limit=500`, `limit=abc`, bad dates → 400; defaults applied; string-to-number transform
- [ ] T063 [P] [US1] Integration tests `apps/lead-service/test/integration/inbox.e2e-spec.ts` — **TC-01**: 25 leads including >6-month-old ones → only last 6 months, 20 items, correct `total`, page 2 remainder, no duplicates; **TC-01b**: unread before read, each group newest first (using `updatedAt`); **TC-02**: narrow `fromDate`/`toDate`, `limit=500` → 400, `fromDate > toDate` → 400, garbage date → 400 in error shape; **TC-03**: A never sees B's leads; held `UNASSIGNED` leads are invisible; no token → 401; response items contain exactly `id, customerName, email, phone, label, hasView, lastUpdate`

### Implementation

- [ ] T064 [P] [US1] Implement `apps/lead-service/src/modules/leads/domain/value-objects/date-range.ts` (pure, clock injected)
- [ ] T065 [US1] Extend `LeadRepositoryPort` with `list(userId, { range, label?, term?, page, limit })` returning `{ items, total }` and implement it in `apps/lead-service/src/modules/leads/infrastructure/repositories/mongoose-lead.repository.ts` (filter `{ userId, assignmentStatus: 'ASSIGNED'?, updatedAt: { $gte, $lte } }`, sort `{ hasView: 1, updatedAt: -1, _id: -1 }`, `skip/limit`, `countDocuments` with the same filter, lean projection to the list fields; map to `LeadListItem` with `lastUpdate`)
- [ ] T066 [US1] Implement `apps/lead-service/src/modules/leads/application/list-leads.service.ts` (cache-aside via `LeadCachePort`, range via `DateRange`, caller `userId` only)
- [ ] T067 [P] [US1] Implement `apps/lead-service/src/modules/leads/interface/http/dto/list-leads-query.dto.ts` (`implements ListLeadsQuery`; `page` ≥ 1; `limit` 1–200 from `PAGINATION`; ISO date validators)
- [ ] T068 [US1] Add `GET /api/v1/leads` (inbox) to `apps/lead-service/src/modules/leads/interface/http/leads.controller.ts` under `JwtAuthGuard`, thin, mapping to the shared `PagedResult<LeadListItem>`; run T060–T063 until green

**Checkpoint**: Inbox API verified against TC-01–TC-03; US6 + US1 give the first demonstrable slice via API.

---

## Phase 8: US2 — Lead Details & Mark as Read, backend (Priority: P1)

**Goal**: Opening a lead returns full details and the activity log and marks it read, without touching `updatedAt`.

**Independent Test**: `GET /api/v1/leads/:id` on an unread lead, then re-list (TC-04, TC-05).

### Tests (write first)

- [ ] T069 [P] [US2] Unit tests `apps/lead-service/src/modules/leads/application/get-lead-details.service.spec.ts`: foreign/missing lead → `NotFoundException` (identical); unread → mark-read called once and `lead:{id}` + owner list version invalidated; already read → no write and no invalidation; cache hit still verifies ownership and still performs the conditional mark-read when unread; activities returned newest first (first `ACTIVITIES_IN_DETAILS` = 50) with `activitiesTotal`; `updatedAt` unchanged
- [ ] T070 [P] [US2] Integration tests `apps/lead-service/test/integration/details.e2e-spec.ts` — **TC-04**: lead with 3 activities → full fields, activities newest first, `hasView=true`, inbox shows it read, `lastUpdate` unchanged; **TC-04b**: two concurrent opens (`Promise.all`) both 200 with a single read transition; **TC-05**: nonexistent id → 404, malformed id → 400, other user's lead → 404 with the same body as nonexistent

### Implementation

- [ ] T071 [US2] Extend `LeadRepositoryPort` (`findOwned(userId, id)`, `markRead(userId, id)` as `updateOne({ _id, userId, hasView: false }, { $set: { hasView: true } })` returning whether it modified) and `LeadActivityRepositoryPort` (`list(leadId, { page, limit })` newest first with `_id` tiebreak + `count`); implement in `mongoose-lead.repository.ts` and `apps/lead-service/src/modules/leads/infrastructure/repositories/mongoose-lead-activity.repository.ts` (activity repository exposes no update/delete)
- [ ] T072 [US2] Implement `apps/lead-service/src/modules/leads/application/get-lead-details.service.ts` (cache-aside for the lead doc only; activities always fetched fresh; invalidate only when `markRead` modified a document)
- [ ] T073 [US2] Add `GET /api/v1/leads/:id` to `leads.controller.ts` with an `ObjectId` param validation pipe (`apps/lead-service/src/common/pipes/parse-object-id.pipe.ts`), mapping to the shared `LeadDetails`; declare it **after** `GET /leads/search` once US5 lands (note in code comment); run T069–T070 until green

**Checkpoint**: Details + read tracking verified (SC-005).

---

## Phase 9: US4 — Lead Labeling, backend (Priority: P2)

**Goal**: Exactly one label per lead; changing it replaces the old one and moves `updatedAt` forward.

**Independent Test**: `PUT /api/v1/leads/:id/label` with valid/invalid labels (TC-08).

### Tests (write first)

- [ ] T074 [P] [US4] Unit tests `apps/lead-service/src/modules/leads/application/set-lead-label.service.spec.ts`: valid label replaces the old one; foreign/missing → NotFound; `updatedAt` moves forward; `lead:{id}` and owner list version invalidated; same label re-submitted still returns 200
- [ ] T075 [P] [US4] DTO tests `apps/lead-service/src/modules/leads/interface/http/dto/set-label.dto.spec.ts`: unknown label, missing body, lowercase value, extra property → 400
- [ ] T076 [P] [US4] Integration tests `apps/lead-service/test/integration/label.e2e-spec.ts` — **TC-08**: `SPAM` then `POTENTIAL` → exactly one label each time and `lastUpdate` moves; invalid label → 400 and label unchanged; other user's lead → 404; the lead moves within the inbox ordering after the change

### Implementation

- [ ] T077 [US4] Extend `LeadRepositoryPort` with `setLabel(userId, id, label, now)` (single `findOneAndUpdate({ _id, userId }, { $set: { label, updatedAt: now } }, { new: true })`) and implement it in `mongoose-lead.repository.ts`
- [ ] T078 [US4] Implement `apps/lead-service/src/modules/leads/application/set-lead-label.service.ts` and `apps/lead-service/src/modules/leads/interface/http/dto/set-label.dto.ts` (`@IsIn(LEAD_LABELS)`, `implements SetLabelRequest`)
- [ ] T079 [US4] Add `PUT /api/v1/leads/:id/label` to `leads.controller.ts` returning `{ id, label, lastUpdate }`; run T074–T076 until green

**Checkpoint**: Labeling verified.

---

## Phase 10: US3 — Lead Activities, backend (Priority: P2)

**Goal**: Append-only follow-up notes, newest first; each new note moves the lead's `updatedAt` forward.

**Independent Test**: `POST`/`GET /api/v1/leads/:id/activities` (TC-06, TC-07, TC-07b).

### Tests (write first)

- [ ] T080 [P] [US3] Unit tests `apps/lead-service/src/modules/leads/application/add-lead-activity.service.spec.ts`: content is trimmed; empty, whitespace-only, and 2001-char content rejected; default type `NOTE`; author id and `authorName` captured from the caller; lead `updatedAt` set to the activity `createdAt` with max semantics (never moves backwards); caches invalidated; foreign/missing lead → NotFound; **the `LeadActivityRepositoryPort` type and the Mongoose adapter expose no update/delete methods** (reflection assertion)
- [ ] T081 [P] [US3] Unit tests `apps/lead-service/src/modules/leads/application/list-lead-activities.service.spec.ts` (ownership check, newest first, paging, `limit` ≤ 200) and DTO tests `dto/add-activity.dto.spec.ts` (empty content, whitespace, 2001 chars, invalid `type`, extra property → 400)
- [ ] T082 [P] [US3] Integration tests `apps/lead-service/test/integration/activity.e2e-spec.ts` — **TC-06**: valid `POST` → 201 persisted, lead `lastUpdate` increases and the lead moves up in the inbox, survives an app restart; **TC-07**: empty/whitespace/2001 chars/invalid type/extra field → 400 and nothing persisted; **TC-07b**: `PUT`/`PATCH`/`DELETE` on `/leads/:id/activities` and `/leads/:id/activities/:aid` → 404/405 and stored data unchanged; two near-simultaneous notes both stored in `createdAt` order; other user's lead → 404 on `GET` and `POST`

### Implementation

- [ ] T083 [US3] Extend `LeadActivityRepositoryPort` with `add(activity)` and implement it in `mongoose-lead-activity.repository.ts` (`create` only); extend `LeadRepositoryPort` with `touch(userId, id, at)` implemented as `updateOne({ _id, userId }, { $max: { updatedAt: at } })`
- [ ] T084 [US3] Implement `apps/lead-service/src/modules/leads/application/add-lead-activity.service.ts` and `list-lead-activities.service.ts`, plus DTOs `apps/lead-service/src/modules/leads/interface/http/dto/add-activity.dto.ts` (`type` optional `@IsIn(ACTIVITY_TYPES)`, `content` trimmed, 1–`NOTE_MAX` chars, must contain a non-whitespace character) and `list-activities-query.dto.ts`
- [ ] T085 [US3] Implement `apps/lead-service/src/modules/leads/interface/http/lead-activities.controller.ts` (replacing the empty placeholder): `POST /api/v1/leads/:id/activities` → 201 `LeadActivityItem`, `GET /api/v1/leads/:id/activities` → `PagedResult<LeadActivityItem>`; no other verbs; remove the empty `application/lead-activities.service.ts` placeholder; run T080–T082 until green

**Checkpoint**: Activities verified, append-only guarantee tested at unit and HTTP level (SC-008).

---

## Phase 11: US5 — Search & Filter, backend (Priority: P2)

**Goal**: Search own leads by name/email/phone with optional label filter, always inside the date range.

**Independent Test**: `GET /api/v1/leads/search` with various `q`/`label`/date combinations (TC-09, TC-10, TC-15).

### Tests (write first)

- [ ] T086 [P] [US5] Unit tests `apps/lead-service/src/modules/leads/domain/value-objects/search-term.spec.ts`: trims; length 2–100 enforced; regex metacharacters escaped (`.*`, `(`, `\`, `$where`); phone digits extracted only when ≥ 3 digits; diacritics/case folded exactly like the writer's `fullNameSearch`
- [ ] T087 [P] [US5] Unit tests extending `list-leads.service.spec.ts` for search mode: requires `q` or `label`; term + label + range combined; label-only; cache key differs per term/label; DTO tests `dto/search-leads-query.dto.spec.ts` (`q` of 1 or 101 chars, unknown label, neither `q` nor `label` → 400)
- [ ] T088 [P] [US5] Integration tests `apps/lead-service/test/integration/search.e2e-spec.ts` — **TC-09**: partial name in different case/diacritics; **TC-10**: phone typed with `+`, spaces, dashes, parentheses; combined with a narrow date range, and an in-range vs out-of-range match; **TC-10b**: email fragment, label-only, `q` + label, neither → 400, length bounds → 400; **TC-15**: `q` of `.*`, `(`, `\`, `$where` matches literally with no errors and no extra rows; never returns another user's leads; ordering and pagination identical to the inbox

### Implementation

- [ ] T089 [P] [US5] Implement `apps/lead-service/src/modules/leads/domain/value-objects/search-term.ts` (uses the same normalizers from `@lead/persistence`)
- [ ] T090 [US5] Extend `mongoose-lead.repository.ts` `list(...)` to add the `$or` of `fullNameSearch` regex, `emailLower` regex, and `phoneDigits` regex (only when the term has ≥ 3 digits) plus the `label` equality filter as residual filters over the `{ userId, hasView, updatedAt }` candidate set
- [ ] T091 [US5] Extend `list-leads.service.ts` with search mode and add `apps/lead-service/src/modules/leads/interface/http/dto/search-leads-query.dto.ts` (`q` 2–100 chars; `label` `@IsIn(LEAD_LABELS)`; at least one of `q`/`label`)
- [ ] T092 [US5] Add `GET /api/v1/leads/search` to `leads.controller.ts` **declared before** `GET /leads/:id`; run T086–T088 until green; run `explain` through the TC-17 test with a search filter and record the docs-examined figure in a comment for the "revisit when > ~5,000" rule (research R-06)

**Checkpoint**: Search verified incl. injection-style inputs.

---

## Phase 12: Backend Hardening & Checkpoint (cross-cutting, before any frontend work)

**Purpose**: Cache, resilience, security, logging, contract drift, and Docker verification for the whole backend.

- [ ] T093 [P] Integration tests `apps/lead-service/test/integration/cache.e2e-spec.ts` — **TC-13**: `GET /leads` twice (second served from Redis, verified via key presence/spy), then activity, label, mark-read, and ingestion each make new data visible immediately; per-user version isolation
- [ ] T094 [P] Integration tests `apps/lead-service/test/integration/resilience.e2e-spec.ts` — **TC-14**: stop the Redis container → all endpoints still correct and `/api/v1/health` reports redis down; restart → caching resumes
- [ ] T095 [P] Integration tests `apps/lead-service/test/integration/security-logging.e2e-spec.ts` — **TC-18**: capture Nest logger output during ingest/list/search/details/label/activity and assert it contains no name, phone, email, message, or note content; **TC-15** gaps: tampered token, `x-api-key` on JWT routes, security headers present
- [ ] T096 [P] Contract-drift check: add `apps/lead-service/test/integration/openapi-contract.e2e-spec.ts` that validates real responses of every endpoint against `specs/003-lead-management/contracts/lead-service.openapi.yaml` (response schemas, status codes); fix code or contract until they agree
- [ ] T097 Enforce coverage thresholds: in `apps/lead-service/jest.config.cjs`, `apps/lead-background-service/jest.config.cjs`, and `packages/persistence/jest.config.cjs` set `coverageThreshold` ≥ 90 % lines/branches scoped to `modules/**/domain/**`, `modules/**/application/**` (and `src/ingestion/**`, `src/normalization/**` for persistence); add `--coverage` to their `test` scripts
- [ ] T098 Backend gate: run `pnpm format:check; pnpm lint; pnpm typecheck; pnpm test; pnpm test:integration`, `docker compose up --build --wait`, `pnpm --filter lead-service seed`, then walk quickstart scenarios 1–3 and 9–10 with `curl`; fix findings

**Checkpoint (backend complete)**: All backend tests green; API verified for US1–US6. **Frontend work starts only now.**

---

## Phase 13: Frontend Foundation (lead-web)

**Purpose**: Sign-in, BFF, app shell, and shared UI/data plumbing ([contracts/ui-layout.md](./contracts/ui-layout.md), research R-12, R-13). Load `.github/instructions/lead-web.instructions.md` and the Next.js 16 docs first (verify `proxy.ts` naming).

### Tests (write first)

- [ ] T099 [P] BFF proxy tests `apps/lead-web/src/app/api/lead-service/[...path]/route.test.ts`: allowlist (only the nine documented API routes/methods; unknown path or method → 404/405; path traversal `..`, encoded slashes rejected); forwards only `content-type`/`accept`; strips `cookie`/`host`; adds `Authorization: Bearer <cookie value>`; no cookie → 401 in the shared error shape; never echoes the token; body size capped
- [ ] T100 [P] Login/logout route tests `apps/lead-web/src/app/api/auth/auth-routes.test.ts`: success sets an httpOnly, `SameSite=Lax` cookie (`Secure` per `SESSION_COOKIE_SECURE`) and the response body never contains the token; failure returns the upstream error shape; logout clears the cookie
- [ ] T101 [P] Component tests for login `apps/lead-web/src/app/(auth)/login/login-form.test.tsx` (inline "Invalid email or password", disabled while submitting, redirect to `/leads`) and `proxy.test.ts` (unauthenticated → redirect to `/login`, `/` → `/leads`, API routes not redirected)

### Implementation

- [ ] T102 Rewrite `apps/lead-web/src/app/api/lead-service/[...path]/route.ts` as the hardened allowlist proxy (GET/POST/PUT only for: `leads`, `leads/search`, `leads/:id`, `leads/:id/label`, `leads/:id/activities`), using `getAccessToken()` from `apps/lead-web/src/lib/server/session.ts` and `LEAD_SERVICE_URL`; extract allowlist matching to `apps/lead-web/src/lib/server/proxy-allowlist.ts`
- [ ] T103 [P] Implement `apps/lead-web/src/app/api/auth/login/route.ts` and `apps/lead-web/src/app/api/auth/logout/route.ts` (thin; set/clear cookie via `session.ts` helpers using `SESSION_COOKIE_NAME`, `SESSION_COOKIE_SECURE`)
- [ ] T104 [P] Update `apps/lead-web/src/proxy.ts` (Next 16 interception; verified filename) to redirect unauthenticated page requests to `/login` and `/` to `/leads`
- [ ] T105 [P] Add shadcn/base-ui components via the CLI into `apps/lead-web/src/components/ui/`: `input`, `select`, `badge`, `table`, `card`, `textarea`, `skeleton`, `sonner` (toast), `pagination`, `alert`; do not add demo files
- [ ] T106 [P] Add `apps/lead-web/src/lib/query/keys.ts` (`leads.list(params)`, `leads.details(id)`, `leads.activities(id)`), `apps/lead-web/src/lib/api/client.ts` (browser-side fetch wrapper to `/api/lead-service/*` returning typed `@lead/shared-contracts` shapes and throwing `ErrorResponse`), and `apps/lead-web/src/hooks/useDebounce.ts`
- [ ] T107 Implement `apps/lead-web/src/app/(auth)/login/page.tsx` + `login-form.tsx` (client form; zod validation; calls `/api/auth/login`) per ui-layout.md
- [ ] T108 Implement the authenticated shell `apps/lead-web/src/app/(app)/layout.tsx` (header with user name and Sign out) and `apps/lead-web/src/components/leads/LabelBadge.tsx` (UNLABELED neutral, POTENTIAL green, SPAM red; text always shown); make `apps/lead-web/src/app/page.tsx` redirect to `/leads`

**Checkpoint**: Can sign in and out through the browser; unauthenticated access redirects; proxy tests green.

---

## Phase 14: US1 + US5 — Inbox UI (Priority: P1/P2)

**Goal**: Inbox screen with unread highlighting, default 6-month range, pagination, search, and label filter.

**Independent Test**: Seeded user opens `/leads`: sees own leads, unread first; search/filter/range/page changes update the list and URL (quickstart 4–5).

### Tests (write first)

- [ ] T109 [P] [US1] Tests `apps/lead-web/src/hooks/useInboxParams.test.ts`: parses/serializes `?q&label&from&to&page&limit`; defaults to last 6 months and page 1/limit 20; resets `page` when any filter changes; clamps `limit` to 200; ignores invalid values
- [ ] T110 [P] [US1] Component tests `apps/lead-web/src/components/leads/LeadTable.test.tsx` (unread rows bold with `Unread` sr-only text, row links to `/leads/[id]`, empty and error states) and `Pagination.test.tsx` (boundaries, total text, page-size change)
- [ ] T111 [P] [US5] Component tests `apps/lead-web/src/components/leads/InboxToolbar.test.tsx`: 300 ms debounce; fires only for 2–100 chars with a hint below 2; label filter; invalid date range (from > to) shows an inline error and keeps previous results; "Last 6 months" reset; scope chip visible when a search/filter is active

### Implementation

- [ ] T112 [P] [US1] Implement `apps/lead-web/src/hooks/useInboxParams.ts` (URL as source of truth via `useSearchParams`/`useRouter`) and `apps/lead-web/src/hooks/useLeads.ts` (React Query; uses `/leads` when no `q`/`label`, otherwise `/leads/search`; keeps previous data while refetching)
- [ ] T113 [P] [US1] Implement `apps/lead-web/src/components/leads/LeadTable.tsx`, `LeadRow.tsx`, and `Pagination.tsx` (presentational; "Showing 1–20 of 248", rows-per-page 20/50/100/200)
- [ ] T114 [P] [US5] Implement `apps/lead-web/src/components/leads/InboxToolbar.tsx`, `DateRangeFilter.tsx` (native `type="date"` inputs inside the shadcn `Input`), and `LabelFilter.tsx` (All, UNLABELED, POTENTIAL, SPAM from `LEAD_LABELS`)
- [ ] T115 [US1] Implement `apps/lead-web/src/app/(app)/leads/page.tsx` (server component mounting a client `InboxView` in `apps/lead-web/src/components/leads/InboxView.tsx`) with loading skeleton, empty states ("No leads in this period. Try a wider date range." / "No leads match. Clear search"), error alert with Retry, refetch on window focus; run T109–T111 until green

**Checkpoint**: Inbox, search, label filter, date range, and pagination work in the browser against the real backend.

---

## Phase 15: US2 + US4 + US3 — Lead Details UI (Priority: P1/P2)

**Goal**: Details screen with automatic read tracking, label select, activity composer, and newest-first timeline.

**Independent Test**: Open an unread lead, change its label, add two notes, return to the inbox (quickstart 6–8).

### Tests (write first)

- [ ] T116 [P] [US4] Tests `apps/lead-web/src/components/leads/LabelSelect.test.tsx`: shows exactly one value; optimistic update; rollback + toast on failure; disabled while saving
- [ ] T117 [P] [US3] Tests `apps/lead-web/src/components/leads/ActivityComposer.test.tsx` (Add disabled when blank or whitespace; counter turns red above 2000; Ctrl+Enter submits; clears on success; keeps text and shows an error on failure) and `ActivityTimeline.test.tsx` (renders in the order provided, newest first; **no edit/delete controls rendered**; "Load more" requests the next page)
- [ ] T118 [P] [US2] Tests `apps/lead-web/src/components/leads/LeadDetailsCard.test.tsx` (all fields incl. source label "Website API"/"External event", 404 state "Lead not found" with Back to inbox, error state) and `apps/lead-web/src/hooks/useLeadDetails.test.tsx` (opening invalidates inbox list queries so the lead shows as read)

### Implementation

- [ ] T119 [P] [US2] Implement `apps/lead-web/src/hooks/useLeadDetails.ts` and `useLeadActivities.ts` (React Query; details fetch invalidates `leads.list` keys; 404 surfaced as a typed state)
- [ ] T120 [P] [US4] Implement `apps/lead-web/src/hooks/useSetLabel.ts` (optimistic mutation, invalidates list + details) and `apps/lead-web/src/components/leads/LabelSelect.tsx`
- [ ] T121 [P] [US3] Implement `apps/lead-web/src/hooks/useAddActivity.ts` (prepends the new entry to the cached first page, invalidates list), `apps/lead-web/src/components/leads/ActivityComposer.tsx` (type select defaulting to Note, textarea, counter, `NOTE_MAX` from shared-contracts), and `ActivityTimeline.tsx` (type icon, author, relative time with absolute `title`, "Load more")
- [ ] T122 [US2] Implement `apps/lead-web/src/components/leads/LeadDetailsCard.tsx` and `apps/lead-web/src/app/(app)/leads/[id]/page.tsx` (server component awaiting `params`, mounting a client `LeadDetailsView` in `apps/lead-web/src/components/leads/LeadDetailsView.tsx`; two columns ≥ 1024 px, stacked below; "Back to inbox" preserves the inbox query string); run T116–T118 until green
- [ ] T123 [US2] Verify no token or API key is present in client bundles: add `apps/lead-web/src/app/bundle-secrets.test.ts` (or a build-output grep step) asserting `LEAD_SERVICE_URL`, `LEAD_SOURCE_API_KEY`, and `JWT` strings are absent from `.next/static`; fix any leak

**Checkpoint**: Full UI flow works manually and via component tests; `pnpm --filter @lead/lead-web test typecheck lint build` green.

---

## Phase 16: End-to-End Tests (Cucumber + Playwright)

**Purpose**: Verify every story against the running compose stack ([test-plan.md](./test-plan.md) E2E table).

- [ ] T124 Add E2E support in `end-to-end/support/`: `api-client.ts` (login helper returning a bearer token, authenticated and API-key requests via Playwright `APIRequestContext`), `kafka-publisher.ts` (kafkajs producer to `E2E_KAFKA_BROKERS`, optional DLQ consumer), `seed-data.ts` (creates a lead via `POST /leads` or a Kafka event with a fresh `eventId`, returns ids); add `publish:lead` script to `end-to-end/package.json`; update `end-to-end/cucumber.mjs` / `test:e2e` script globs for `features/leads/**`
- [ ] T125 [P] [US6] `end-to-end/features/leads/ingestion-api.feature` + `end-to-end/step-definitions/leads/ingestion-api.steps.ts`: accepted with key; rejected without key; invalid payload rejected; lead appears unread in the assigned user's inbox (`@us6`)
- [ ] T126 [P] [US6] `end-to-end/features/leads/ingestion-kafka.feature` + steps: event appears in the inbox within 60 s; duplicate delivery → one lead; invalid event → one DLQ message (`@us6`)
- [ ] T127 [P] [US1] `end-to-end/features/leads/inbox.feature` + steps: unread first/newest first; default 6-month range; pagination (`page`, `limit`, `total`); empty state; user B cannot see A's leads (`@us1`)
- [ ] T128 [P] [US2] `end-to-end/features/leads/details-read.feature` + steps: opening marks read and inbox reflects it; foreign lead → 404 (`@us2`)
- [ ] T129 [P] [US3] `end-to-end/features/leads/activity.feature` + steps: two notes appear newest first; empty note rejected; no edit/delete endpoints; lead moves up in the inbox (`@us3`)
- [ ] T130 [P] [US4] `end-to-end/features/leads/label.feature` + steps: set then change label → exactly one; invalid label rejected (`@us4`)
- [ ] T131 [P] [US5] `end-to-end/features/leads/search.feature` + steps: by name, email, phone formats; label filter; combined; outside date range excluded; special characters (`@us5`)
- [ ] T132 [P] `end-to-end/features/leads/access-control.feature` + steps: no token → 401; invalid/expired token → 401; token absent from page HTML, scripts, and `localStorage` after login (`@sec`)
- [ ] T133 `end-to-end/features/leads/ui-journey.feature` + `end-to-end/step-definitions/leads/ui-journey.steps.ts` (Playwright browser): sign in → inbox shows seeded leads → search → open lead (becomes read) → change label → add note → back to inbox shows updated state; attach screenshot/trace on failure (`@ui`)
- [ ] T134 Wire E2E into the compose `e2e` profile and `.github/workflows/ci.yml`: seed step (`pnpm --filter lead-service seed` or `docker compose exec lead-service node dist/src/cli/seed.js`), pass the `E2E_*` variables, upload `end-to-end/reports/`; confirm `pnpm test:e2e` is green locally against `docker compose --profile e2e up --build --wait`

**Checkpoint**: All Cucumber features pass against the compose stack.

---

## Phase 17: Polish & Cross-Cutting

- [ ] T135 [P] Fix `specs/003-lead-management/quickstart.md` command paths to match the implementation (`node dist/src/cli/seed.js`, `pnpm --filter @lead/e2e publish:lead`) and update `README.md` with sign-in, seed, ingestion, and test instructions
- [ ] T136 [P] Update `docs/system-design-architecture.md`: document the `@lead/persistence` package, port-placement rules (resolves the constitution's `TODO(PORT_PLACEMENT_RULES)`), the `updatedAt` date-range rule, the search-field approach, the Kafka event contract and DLQ, and the removed `PUT /leads/:id/view`
- [ ] T137 [P] Add FR traceability table (FR-001–FR-033 → test files) at the end of this file and confirm every FR has at least one test; confirm SC-005, SC-007, SC-008 are covered by TC-04, TC-12, TC-03/TC-07b
- [ ] T138 Review CI/workflows (`.github/workflows/ci.yml`, `.github/workflows/build.yml`) and `turbo.json` so `@lead/persistence` tasks, new integration suites, and E2E run on pull requests; verify Docker images still build
- [ ] T139 Final gate: `pnpm format:check; pnpm lint; pnpm typecheck; pnpm test; pnpm test:integration; pnpm test:e2e`, then run every quickstart scenario in `specs/003-lead-management/quickstart.md` and confirm `docker compose logs` contains no PII

---

## Dependencies & Execution Order

### Phase dependencies

```text
Phase 1 Setup
  └─▶ Phase 2 Database ─▶ Phase 3 Shared packages ─▶ Phase 4 Backend platform
        (T007 constants feed Phase 2; T012–T020 need T007)           │
                                                                     ├─▶ Phase 5 US6 API ingestion ─┐
                                                                     ├─▶ Phase 6 US6 Kafka consumer ─┤  (needs Phase 2, 3; Phase 4 only for Redis/config conventions)
                                                                     │                               ▼
                                                                     └─▶ Phase 7 US1 Inbox ─▶ Phase 8 US2 ─▶ Phase 9 US4 ─▶ Phase 10 US3 ─▶ Phase 11 US5
                                                                                                      │
                                                                                                      ▼
                                                                           Phase 12 Backend hardening & gate
                                                                                                      │
                                                                                                      ▼
                                                                  Phase 13 FE foundation ─▶ Phase 14 Inbox UI ─▶ Phase 15 Details UI
                                                                                                      │
                                                                                                      ▼
                                                                                          Phase 16 E2E ─▶ Phase 17 Polish
```

- **Phases 2 → 3 → 4** are strictly sequential foundations (user priority: database, shared packages, backend first). Within Phase 3 only T007 is needed early (done in Phase 2); the rest can overlap with late Phase 2 tasks.
- **Phase 6 (Kafka consumer)** is independent of Phases 7–11 and can run in parallel with them once Phases 2–3 are done (different app, different files).
- **Phases 7–11** all edit `leads.controller.ts`, `mongoose-lead.repository.ts`, and `leads.module.ts`, so run them in order (US1 → US2 → US4 → US3 → US5), not in parallel. US2's activities read uses the port added there; US3 adds the write side.
- **Phase 12** requires Phases 5–11. **Phases 13–15 must not start before Phase 12 passes** (requested priority).
- Phase 14 (inbox UI) depends on Phase 13; Phase 15 depends on Phase 13 and shares hooks/keys with Phase 14 (sequential recommended). Phase 16 requires Phases 12–15. Phase 17 last.

### Within each phase

Tests first (fail) → domain/ports → application → infrastructure → interface → wiring → tests green.

---

## Parallel Execution Examples

- **Phase 2 tests**: T008, T009, T010 (and T011 once schemas exist) in parallel; **schemas**: T014, T015, T016, T017 in parallel; then T018 → T019.
- **Phase 3**: T023, T024 (tests) then T025, T026, T027 in parallel, then T028.
- **Phase 4**: T030, T031, T032 tests in parallel; T036, T037, T038 in parallel after T033–T035.
- **Phase 6** with **Phases 7–11**: one developer on `apps/lead-background-service` (T050–T059) while another does the lead-service story phases.
- **Phase 7 tests**: T060, T061, T062, T063 in parallel.
- **Phase 16**: T125–T132 feature files in parallel after T124.

---

## Implementation Strategy

### MVP (backend first)

1. Phases 1–4 (setup, database, shared packages, platform).
2. Phase 5 (US6 API ingestion) + Phase 7 (US1) + Phase 8 (US2): a salesperson can receive, list, and open leads via the API — **stop and validate with `curl`/integration tests** (quickstart scenarios 1, 4–6 via API).
3. Phase 13 + Phase 14 (inbox) + the details read part of Phase 15 give the first usable UI.

### Incremental delivery order

Phases 9 (label) → 10 (activities) → 11 (search) add value one story at a time, each independently testable through the API; Phase 6 (Kafka) adds the second ingestion source; Phase 12 closes the backend; frontend phases then expose each story; Phase 16 locks behavior with E2E.

### Suggested MVP scope

User Stories **US6 (API ingestion), US1, US2** through the backend (Phases 1–5, 7, 8, 12 subset) plus the inbox/details UI (Phases 13–15 read-only parts).

---

## Notes

- Every task has an exact path; where a file is **replaced**, the placeholder named in the task is removed in the same task.
- Quote data-model constraints verbatim in code (schema, DTO, zod); do not weaken limits.
- Commit after each task or logical group; never commit with failing format/lint/type-check (Constitution III).
