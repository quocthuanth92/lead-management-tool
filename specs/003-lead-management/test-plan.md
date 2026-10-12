# Test Plan: Lead Management

Satisfies Constitution V (tests required for domain/application behavior; integration tests for REST,
persistence, and security) and extends the strategy in `docs/system-design-architecture.md` (TC-01 … TC-15;
TC-16 k6 performance is out of scope for this feature). Commands are in [quickstart.md](./quickstart.md).

## Layers

| Layer       | Tooling                                         | Scope                                                                                          | Runs in                                | Needs Docker |
| ----------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------- | ------------ |
| Unit        | Jest (all packages/apps); RTL for web           | Domain value objects, use-case services with fake ports, normalizers, DTO validation, hooks/components, consumer logic | `pnpm test` (turbo)                    | no           |
| Integration | Jest + Supertest + Testcontainers (Mongo, Redis, Kafka) | Real REST pipeline (guards, pipes, filter), real indexes/queries, cache behavior, Kafka consumer | `pnpm test:integration`                | yes          |
| E2E         | Cucumber (Gherkin) + Playwright                 | Running compose stack: API scenarios via `APIRequestContext`, Kafka publish, UI journey        | `pnpm test:e2e`                        | yes          |

Rules: unit tests never touch the network or Docker; every new use-case has a unit test before its
controller is wired; integration suites seed their own data per test (unique emails/phones) and clean up;
E2E scenarios are independent and create their own leads through the ingestion API.

## Unit tests

### `@lead/shared-contracts`
- `leadIngestEventSchema`: valid event; each missing required field; bad uuid; oversized fields; unknown
  keys rejected; `parseLeadIngestEvent` issues never contain input values.
- Constants: `MAX_LIMIT = 200`, `DEFAULT_RANGE_MONTHS = 6`, enum members.
- Parity test: OpenAPI/JSON Schema enums, limits, required fields equal the TypeScript constants.

### `@lead/persistence`
- Phone normalization (spaces, dashes, parentheses, `+`, `00` prefix, too short/long); name folding
  (case, diacritics, `đ`); email lower-casing; derived-field builder.
- Cache keys: stable hash for equal queries regardless of param order; different users/versions differ.

### lead-service (domain + application, fake ports)
| Unit                      | Cases                                                                                                                   |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `DateRange`               | default = last 6 months; from > to rejected; date-only `toDate` inclusive end of day; boundaries                        |
| `SearchTerm`              | trims; length 2–100; escapes regex metacharacters; phone digits extracted only when ≥ 3 digits                          |
| `ListLeads` (inbox)       | passes `userId` from caller only; default range/page/limit; limit > 200 rejected; sort spec = unread first then newest; cache hit skips repository; miss populates cache; Redis error falls back |
| `ListLeads` (search)      | combines term + label + range; label-only; requires `q` or `label`                                                     |
| `GetLeadDetails`          | foreign/missing → NotFound; unread → mark-read called once and caches invalidated; already read → no write, no invalidation; response has newest-first activities and total; `updatedAt` unchanged |
| `SetLeadLabel`            | valid label replaces; invalid rejected; foreign/missing → NotFound; `updatedAt` moves forward; caches invalidated      |
| `AddLeadActivity`         | trims; empty/whitespace/2001 chars rejected; default type NOTE; author name captured; lead `updatedAt` moved; caches invalidated; **port has no update/delete** (type-level + reflection test) |
| `CreateLead`              | validates; stores source INTERNAL, unread, UNLABELED; assigned vs held; no PII in captured log output                    |
| `Auth.login`              | correct credentials → token with `sub`/role; wrong password and unknown email → same error; inactive user rejected     |
| Guards                    | `JwtAuthGuard` rejects missing/expired/tampered; `ApiKeyGuard` constant-time compare, rejects missing/wrong            |
| DTOs                      | `limit=500`, `page=0`, bad dates, unknown label, extra properties, invalid ObjectId → 400 via `ValidationPipe`          |

### lead-background-service
| Unit                  | Cases                                                                                                                  |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `ProcessLeadEvent`    | valid → ingest (source EXTERNAL, `externalEventId`) → invalidate; duplicate-key → acknowledged, no invalidation, no error; invalid → DLQ without retry; transient failure → retries with backoff (fake timers) then DLQ; success on retry n; DLQ publish failure rethrows; Redis failure ignored; logs contain no PII |
| Handler               | thin: delegates only; uses message key/value from Kafka context                                                        |

### lead-web (RTL + Jest)
- `useInboxParams`: parse/serialize URL state; defaults to last 6 months; resets page on filter change.
- `LeadTable`: unread styling + sr-only text; row link target; empty and error states.
- `InboxToolbar`: debounce, min-length hint, label filter, invalid range error.
- `Pagination`: boundaries, total text, page-size change.
- `LabelSelect`: single value, optimistic update, rollback on error.
- `ActivityComposer`: disabled when blank, counter > 2000, Ctrl+Enter, clears on success, keeps text on error.
- `ActivityTimeline`: newest first order as provided; no edit/delete controls rendered (assertion).
- BFF proxy: allowlist (rejects unknown path/method), strips cookie/host headers, adds Bearer from cookie,
  401 without cookie, never echoes the token. Login route sets httpOnly cookie and does not return the token.

## Integration tests (Testcontainers)

Shared harness: `test-app.factory.ts` (exists) extended to start Mongo (replica set) + Redis containers once
per suite, build the Nest app with real modules, seed two salespeople (A, B) and helpers to log in.

| ID    | Area        | Scenario                                                                                                    | Expected                                                                          |
| ----- | ----------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| TC-01 | Inbox       | `GET /leads` without params, 25 leads incl. >6-month-old                                                    | Only last 6 months; 20 items; `total` correct; page 2 has remainder; no duplicates |
| TC-01b| Inbox       | Mix of read/unread with varied `updatedAt`                                                                  | Unread first, each group newest first                                             |
| TC-02 | Inbox       | Narrow `fromDate`/`toDate`; `limit=500`; `fromDate > toDate`; garbage date                                  | Only in-range; 400 for the invalid ones in error shape                            |
| TC-03 | Ownership   | A lists/gets/labels/annotates B's lead                                                                      | Not in list; 404 on get/put/post (same as nonexistent)                             |
| TC-04 | Details     | Open lead with 3 activities                                                                                 | Full fields; activities newest first; `hasView=true`; inbox shows read; `lastUpdate` unchanged |
| TC-04b| Details     | Open twice concurrently (`Promise.all`)                                                                     | Both 200; single read transition                                                  |
| TC-05 | Details     | Nonexistent id; malformed id                                                                                | 404; 400                                                                          |
| TC-06 | Activity    | Valid `POST`                                                                                                | 201; persisted; lead `lastUpdate` increases and lead moves up in inbox; survives restart of app |
| TC-07 | Activity    | Empty, whitespace, 2001 chars, invalid type, extra field                                                    | 400; nothing persisted                                                            |
| TC-07b| Activity    | `PUT`/`PATCH`/`DELETE` on `/leads/:id/activities[/:aid]`                                                    | 404/405; stored data unchanged                                                    |
| TC-08 | Label       | Set `SPAM`, then `POTENTIAL`; invalid label; missing body                                                   | 200 each valid with exactly one label; 400 invalid; `lastUpdate` moves             |
| TC-09 | Search      | `q` = part of name (case/diacritics variations)                                                             | Matching leads only                                                               |
| TC-10 | Search      | `q` = phone typed with `+`, spaces, dashes; combined with narrow date range; match outside range           | Found when in range; excluded when outside                                        |
| TC-10b| Search      | `q` = email fragment; label-only; `q` + label; no `q`/`label`; `q` of 1 char or 101 chars                   | Correct sets; 400 for invalid                                                     |
| TC-11 | Ingest API  | Valid `POST /leads` with key; wrong/missing key; invalid body; same body twice                              | 201 unread/UNLABELED/INTERNAL/assigned; 401; 400; two distinct leads (no dedupe for API) |
| TC-11b| Ingest API  | Zero active salespeople                                                                                     | 201; stored UNASSIGNED; invisible to all users                                    |
| TC-12 | Kafka       | Publish valid event; same event twice; event for 2 salespeople round-robin                                 | One lead per eventId in MongoDB; visible in inbox            |
| TC-12b| Kafka       | Invalid payload; poison JSON                                                                                | No lead; one DLQ message each with envelope; consumer keeps running               |
| TC-12c| Kafka       | Mongo down then up during processing                                                                        | Retries then succeeds or lands in DLQ after attempts                              |
| TC-13 | Cache       | `GET /leads` twice, then add activity / label / ingest                                                      | 2nd served from Redis (spy on key); new data visible immediately after each write |
| TC-14 | Resilience  | Stop Redis container                                                                                        | Reads and writes still correct (slower); health reports redis down                |
| TC-15 | Security    | Missing/expired/tampered JWT; `x-api-key` on JWT routes; `q` with `.*`, `(`, `$where`, `\`                  | 401; key ignored on JWT routes; special chars matched literally, no errors        |
| TC-17 | Persistence | Index inspection + `explain` on inbox query (userId, hasView, updatedAt range)                              | Expected indexes exist; winning plan uses `{ userId, hasView, updatedAt }` index with no COLLSCAN/in-memory sort |
| TC-18 | Logging     | Capture logs during ingest/consume/search                                                                   | No name/phone/email/message/note content                                          |
| TC-19 | Rate limit  | Exceed throttle on `/auth/login` and `/leads`                                                               | 429 in error shape                                                                |

## E2E (Cucumber + Playwright) against the compose stack

Setup: `docker compose --profile e2e up --build --wait`, then the `seed` command creates salespeople A and B
(`E2E_USER_*`). Each scenario creates its own leads via `POST /leads` (API key) or by publishing to Kafka
with a fresh `eventId`, so scenarios are order-independent. Tags map to stories.

| Feature file (`end-to-end/features/leads/`) | Tag     | Key scenarios                                                                                         |
| ------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------- |
| `ingestion-api.feature`                     | @us6    | accepted with key; rejected without key; invalid payload rejected; lead appears unread in inbox       |
| `ingestion-kafka.feature`                   | @us6    | event appears in inbox within 60 s; duplicate delivery → one lead; invalid event → DLQ (consume DLQ topic) |
| `inbox.feature`                             | @us1    | unread first/newest first; default 6-month range; pagination (`limit`, `page`, `total`); empty state; user B cannot see A's leads |
| `details-read.feature`                      | @us2    | open marks read; inbox reflects it; foreign lead → 404                                                |
| `activity.feature`                          | @us3    | add two notes → newest first; empty note rejected; no edit/delete endpoints; lead moves up in inbox   |
| `label.feature`                             | @us4    | set then change label → exactly one; invalid label rejected                                           |
| `search.feature`                            | @us5    | by name/email/phone formats; label filter; combined; outside date range excluded; special characters  |
| `ui-journey.feature`                        | @ui     | sign in → inbox shows leads → search → open lead (becomes read) → change label → add note → back to inbox shows updated state |
| `access-control.feature`                    | @sec    | no token → 401; expired/invalid token → 401; token never present in page HTML, JS, or `localStorage`  |

Reports: existing HTML/JSON formatters; failing UI scenarios attach a Playwright screenshot/trace.

## Exit criteria

- All unit, integration, and E2E suites green in CI; no skipped tests without a linked reason.
- Coverage on new domain/application code ≥ 90 % lines and branches (Jest `coverageThreshold` scoped to
  `modules/**/domain` and `modules/**/application` in both backends and `@lead/persistence`); UI hooks and
  components ≥ 80 %.
- Traceability: every spec FR maps to at least one test (table maintained in `tasks.md`; checked in review).
- SC-005, SC-007, SC-008 are verified directly by TC-04, TC-12, TC-03/TC-07b.
