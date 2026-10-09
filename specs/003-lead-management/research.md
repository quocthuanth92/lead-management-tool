# Research: Lead Management

Decisions that shape the design. Package versions are not re-surveyed here; `002-codebase-scaffolding`
pinned the toolchain. Any new dependency is installed at its latest version compatible with Nest 11 /
Mongoose 8.19 and checked against peer ranges at install time.

No `NEEDS CLARIFICATION` items remain. The architecture document's "To confirm" list is resolved as:
Kafka event format → R-09, initial labels → R-04.

## R-01 Scope baseline (what already exists)

- **Decision**: Build on the 002 scaffold, replacing placeholders rather than adding parallel code.
- **Verified in the repo**: `leads` module has placeholder entity/ports/service/controller
  (`POST /leads/placeholder`); `LeadActivitiesService/Controller` are empty; `AuthGuard` returns `true`;
  `CachePort` has only `get`/`set`; the consumer handler logs a placeholder event and derives its event id
  from `topic + Date.now()` (not idempotent); the BFF proxy forwards every request header and has no
  allowlist; `shared-contracts` exports only `API_PREFIX`, `ErrorResponse`, health types; compose already
  has Mongo, Redis, Kafka (`localhost:9092` external listener), and the e2e project has smoke features.
- **Consequence**: Placeholder endpoint and placeholder classes are removed in Step 3.

## R-02 Sharing persistence between lead-service and lead-background-service

- **Decision**: New Node-only workspace package `@lead/persistence` containing Mongoose schemas, index
  definitions, search-field normalizers, cache-key builders, and a `LeadWriter` (only idempotent
  insert). Apps wrap it in their own ports/adapters; domain entities stay per app.
- **Rationale**: The architecture has the consumer writing directly to MongoDB. Identical schema, indexes and de-duplication are required in both writers (FR-028, FR-029). One implementation removes
  drift. It is infrastructure code, so it sits behind each app's ports and honors the hexagonal rules.
- **Alternatives**: Duplicate schemas (drift); consumer calls lead-service over HTTP (contradicts the
  documented flow and couples availability); put Mongoose schemas in `shared-contracts` (would pull
  Node/Mongoose into the browser-safe package).

## R-03 Code-first schemas, indexes, and migrations

- **Decision**: Mongoose schemas are the source of truth. Indexes are declared on the schemas and created by
  `syncIndexes()` at lead-service start when `MONGODB_SYNC_INDEXES=true` (default true outside production;
  in production an explicit one-off `db:sync-indexes` script runs during deploy). JSON-Schema validators
  are not added in this iteration (Mongoose + DTO validation cover it); a `schemaVersion` field is stored
  on documents so later migrations stay possible (schema-design skill: schema versioning).
- **Rationale**: Prevents surprise index builds on production at boot while keeping local/CI zero-setup.
- **Alternatives**: `autoIndex` everywhere (risky builds at scale); migration framework (overkill for one
  release).

## R-04 Labels and activity types

- **Decision**: `LEAD_LABELS = ['UNLABELED','POTENTIAL','SPAM']` (default `UNLABELED`);
  `ACTIVITY_TYPES = ['CALL','EMAIL','SMS','NOTE','OTHER']` (default `NOTE`); both are `as const` arrays in
  `shared-contracts`, so DTO decorators, Mongoose enums, zod schemas, and web selects all derive from one
  list. Exactly one label per lead is a single string field, not an array.
- **Rationale**: Spec FR-016, FR-023; "multiple labels" is listed as future work in the architecture doc.
- **Alternatives**: Free-text labels (breaks filtering and the "allowed set" rule); labels collection
  (unnecessary indirection for 3 fixed values).

## R-05 Date range and ordering semantics

- **Decision**:
  - The date range filters on `updatedAt` ("last update": creation, label change, or new activity). Marking
    read does not change it (FR-013). Default range = `[now − 6 months, now]` computed server-side in UTC
    when `fromDate`/`toDate` are absent; `toDate` is inclusive to end-of-day when given as a date.
  - Inbox order = unread first (`hasView` ascending), then `updatedAt` descending, then `_id` descending as a
    stable tiebreaker. Pagination is offset-based (`page`, `limit`, default 20, max 200) with an exact total.
- **Rationale**: Spec Assumption "newest = most recently updated; unread always above read"; the inbox shows
  `lastUpdate`, so filtering on the same field is what users see. The index
  `{ userId: 1, hasView: 1, updatedAt: -1 }` serves filter + sort together (equality → sort → range).
- **Alternatives**: Filter on `createdAt` (hides active old leads; needs a second index); cursor pagination
  (spec and architecture specify page/limit and a total; revisit above ~100k leads per user).

## R-06 Search implementation

- **Decision**: Search by case-insensitive substring over three precomputed fields written at insert:
  `fullTextSearch` (lower-cased, diacritics folded, whitespace collapsed), `emailLower`, `phoneDigits`
  (digits only, leading `+`/formatting removed). The query is
  `{ userId, updatedAt: range, [label], $or: [name regex, email regex, phone regex (only if the term has ≥ 3 digits)] }`
  with the term regex-escaped and length-capped (2–100 chars). The `{ userId, hasView, updatedAt }` index
  bounds the candidate set to one salesperson's date range; the regex runs only on those documents.
- **Rationale**: Satisfies partial matching (FR-006), phone formatting insensitivity (FR-010), and plain-text
  handling of special characters (edge case, TC-15). A text index tokenizes whole words and cannot match
  "john" inside "johnson" or a partial phone number.
- **Alternatives**: MongoDB text index (architecture doc; fails partial/phone requirements); Atlas Search
  (not available on the local single-node MongoDB used by compose; adds infrastructure); separate
  `$regex` on raw fields (not case/diacritic/phone-format tolerant).
- **Revisit when**: `explain` shows > ~5,000 documents examined per search for a typical salesperson; then
  add Atlas Search or n-gram fields (query-optimizer skill workflow).

## R-07 Lead assignment rule

- **Decision**: Outside the scope

## R-08 Held (unassigned) leads

- **Decision**: Outside the scope

## R-09 Kafka event contract, retry, and dead-letter

- **Decision**: Topic `leads.incoming`, DLQ `leads.incoming.dlq` (names already in env schema). Message value
  is JSON validated by a shared zod schema: `{ schemaVersion: 1, eventId (UUID), occurredAt (ISO), lead: { fullName, phone, email?, message } }`.
  The Kafka message key is `eventId`. `eventId` is stored on the lead as `externalEventId` under a unique
  partial index; a duplicate-key error on insert means "already processed" and is acknowledged silently
  (FR-029). Failure handling:
  - **Invalid** (schema/format): not retried; published straight to the DLQ with the original payload and
    the validation reasons (no PII in logs; payload stays only in the DLQ message).
  - **Transient** (e.g. MongoDB temporarily unavailable): 3 attempts with exponential
    backoff (1 s base, already `CONSUMER_RETRY_*` constants), then DLQ.
  - Offset is committed only after success, acknowledged duplicate, or a successful DLQ publish; if the DLQ
    publish itself fails the handler throws so Kafka redelivers.
  - Redis invalidation failures are logged and never fail the event.
- **Rationale**: Architecture doc (idempotent consumer, retries, DLQ); spec FR-029/FR-030.
- **Alternatives**: Separate processed-events collection (extra write; unique index on the lead already
  gives the same guarantee); Kafka transactions (not needed for a single idempotent write).

## R-10 Internal ingestion authentication

- **Decision**: `POST /api/v1/leads` requires header `x-api-key`, compared in constant time with
  `LEAD_SOURCE_API_KEY` (already in the env schema, ≥ 32 chars outside tests). Missing/invalid → 401. The
  route is not JWT-protected; all other lead routes are JWT-protected and ignore `x-api-key`. Throttler
  limits apply to both.
- **Rationale**: Architecture doc and spec FR-024; constant-time comparison avoids timing leaks.
- **Alternatives**: JWT service accounts (more infrastructure than this feature needs).

## R-11 Authentication and ownership

- **Decision**: Minimal `POST /api/v1/auth/login` (email + password → `{ accessToken, user }`), password
  hashing with Node's built-in `crypto.scrypt` behind a `PasswordHasherPort` (no native dependency),
  `JwtAuthGuard` verifying the token and attaching `{ userId, role }`. Every lead query includes `userId`
  from the token, so a lead of another salesperson behaves exactly like a missing one (404, FR-014).
  Seed command creates demo salespeople. Admin role exists in the schema but has no special access in this
  feature (out of scope).
- **Rationale**: Enabling slice (see plan Complexity Tracking); token never leaves the server side (R-12).
- **Alternatives**: Third-party identity provider (explicitly out of scope).

## R-12 Web architecture (BFF, client-rendered)

- **Decision**: Browser → Next.js route handlers (`/api/auth/*`, `/api/lead-service/*`) → lead-service. The
  JWT is stored in an httpOnly, `SameSite=Lax`, `Secure` (in production) cookie. The proxy is **replaced
  with a hardened allowlist**: only the nine API routes/methods used by the UI, forwards only
  `content-type`/`accept`, adds `Authorization: Bearer <cookie>`, strips cookies/host headers, validates the
  path against the allowlist (no path traversal), caps body size. `proxy.ts` redirects unauthenticated
  visitors to `/login` (file name verified against Next 16 docs at implementation, per the web
  instructions). Screens are client components using React Query (inbox/details) per "prioritize
  client-rendered content"; `layout`/`page` files stay server components that only mount client components.
- **Rationale**: Project rule (internal APIs only via server-side code); the current proxy forwards all
  headers and every path, which would be a security gap once real data exists.
- **Alternatives**: Server-component data fetching for lists (conflicts with client-rendered priority and
  makes search/pagination interactions heavier); calling lead-service from the browser (exposes token).

## R-13 UI composition and URL state

- **Decision**: shadcn/base-ui primitives already in the repo (`button`) plus `input`, `select`, `badge`,
  `table`, `card`, `textarea`, `skeleton`, `sonner`-style toast, and a pagination control added through the
  shadcn CLI. Date range uses two native `type="date"` inputs inside shadcn `Input` for accessibility with no
  extra date library. Inbox state (`q`, `label`, `from`, `to`, `page`, `limit`) lives in the URL query string
  so refresh, back navigation, and links preserve it. Layout details in
  [contracts/ui-layout.md](./contracts/ui-layout.md).
- **Rationale**: Spec says the page must restore the previous list when returning from a lead; keeps the
  bundle small.
- **Alternatives**: Heavy data-grid or date-picker libraries (unneeded for 7 columns and 2 dates).

## R-14 Caching rules (cache-aside)

- **Decision**: Keys from `@lead/persistence/cache-keys`: list/search `leads:{userId}:{version}:{sha1(normalized query)}`
  TTL 60 s; details `lead:{id}` TTL 300 s (stores the lead and `userId` so ownership is still checked on a
  hit; activities are **not** cached inside it, they come from their own query so a new note is never hidden);
  `leads:version:{userId}` is a counter. Every write (new lead, label, activity, mark-read)
  deletes `lead:{id}` and `INCR`s the owner's version. Redis errors are logged and the request falls
  through to MongoDB (TC-14). Mark-read always hits MongoDB (conditional update) even on a details cache hit.
- **Rationale**: Instruction guide (cache-aside via ioredis, structured keys); architecture cache section.
- **Alternatives**: Caching activities with the lead (invalidation churn on every note); write-through
  (more complex failure modes).

## R-15 Mark-as-read behavior

- **Decision**: `GET /leads/:id` performs the ownership-scoped read, then runs
  `updateOne({ _id, userId, hasView: false }, { $set: { hasView: true } })` (no `updatedAt` change). Only
  when `modifiedCount = 1` are caches invalidated. Concurrent opens are naturally idempotent (second
  update matches nothing). The response reports `hasView: true`.
- **Rationale**: FR-013; edge case "opened simultaneously".

## R-16 Activities: append-only and ordering

- **Decision**: `lead_activities` is a separate collection (unbounded growth; schema-design skill:
  avoid unbounded arrays). The repository port exposes only `add` and `list`; no update/delete methods or
  routes exist, and the Mongoose model is not exposed for writes outside `add`. `GET /leads/:id` embeds the
  newest 50 activities plus `activitiesTotal`; `GET /leads/:id/activities?page&limit` pages the rest, all
  `createdAt` descending with `_id` descending tiebreak. Adding an activity inserts the document, then sets
  the lead's `updatedAt` to the activity's `createdAt` using `$max` semantics so concurrent notes never move
  `updatedAt` backwards. Author display name is denormalized onto the activity (`authorName`) to avoid
  per-row lookups (schema-design: extended reference).
- **Rationale**: FR-018–FR-022 and the "two notes at once" edge case.
- **Alternatives**: Embedding activities in the lead (unbounded array; 16 MB risk); multi-document
  transaction (not required: if the second write fails the activity exists and the next write/refresh fixes
  `updatedAt`; failure is surfaced as 500 and the user retries).

## R-17 Validation and error mapping

- **Decision**: lead-service HTTP DTO classes (class-validator) implement the shared request interfaces and
  read limits/enums from `shared-contracts`; the existing global `ValidationPipe`
  (whitelist, forbidNonWhitelisted, transform) and `AllExceptionsFilter` produce `{ statusCode, message, error }`.
  Query params are transformed (`page`, `limit`) and bounded (400 above 200, FR-005). Invalid ranges
  (`fromDate > toDate`, bad dates) → 400. Web forms and the Kafka consumer use the shared zod schemas built
  from the same constants. A contract-parity test asserts zod rules and DTO decorators agree on limits and enums.
- **Rationale**: Instruction guide mandates class-validator for Nest; zod is already how env and events are
  validated; constants as the single source avoid rule drift.
- **Alternatives**: zod-only pipe in Nest (deviates from guide); class-validator in the shared package
  (not browser-safe).

## R-18 PII in logs

- **Decision**: Loggers never include `fullName`, `phone`, `email`, `message`, or note content. Logs carry
  ids (`leadId`, `eventId`, `userId`) and counts only. A unit test guards the ingestion/consumer logging
  paths by asserting no PII substrings appear in captured log output.
- **Rationale**: FR-033; architecture non-functional requirement.

## R-19 Testing approach

- **Decision**: Pyramid per the architecture doc and Constitution V; full matrix in
  [test-plan.md](./test-plan.md). Integration uses Testcontainers for Mongo, Redis, and Kafka so index and
  persistence behavior is real. E2E extends the existing Cucumber + Playwright project: API scenarios use
  Playwright `APIRequestContext`, plus UI-journey scenarios for the main flow, running against the compose
  environment seeded by `lead-service` `seed` command.
- **Alternatives**: In-memory Mongo (does not verify indexes/regex behavior); mocks only (fails Principle V).
