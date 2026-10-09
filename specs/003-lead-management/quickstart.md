# Quickstart: Validate Lead Management

Run guide for proving the feature works end to end. Contracts: [lead-service.openapi.yaml](./contracts/lead-service.openapi.yaml),
[lead-ingest-event.schema.json](./contracts/lead-ingest-event.schema.json); data design:
[data-model.md](./data-model.md); test strategy: [test-plan.md](./test-plan.md).

## Prerequisites

- Node.js 24, pnpm via Corepack (`corepack enable`), Docker with Compose.
- Dependencies installed: `pnpm install`.
- Environment files copied from each `.env.example` (see [environment variables](./contracts/environment-variables.md)).

## 1. Quality gates and unit tests (no Docker)

```powershell
pnpm format:check; pnpm lint; pnpm typecheck; pnpm test
```

Expected: all green, including `@lead/shared-contracts`, `@lead/persistence`, both backends, and lead-web.

## 2. Integration tests (Docker required)

```powershell
pnpm test:integration
```

Expected: Testcontainers start MongoDB/Redis/Kafka; TC-01 … TC-19 pass; index/explain test confirms the
inbox query uses `{ userId, hasView, updatedAt }`.

## 3. Run the full stack

```powershell
docker compose up --build --wait
docker compose exec lead-service node dist/cli/seed.js
```

Expected: all services healthy; seed prints the demo salesperson emails (passwords come from
`SEED_SALESPERSON_PASSWORD`).

## 4. Manual scenarios

| #  | Story | Steps                                                                                                                                          | Expected                                                                                  |
| -- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1  | US6   | `POST http://localhost:3001/api/v1/leads` with header `x-api-key` and body `{ "fullName": "Tran Van An", "phone": "+84 90 123 4567", "message": "Test drive please" }` | 201 `{ id }`; same call without the key → 401                                              |
| 2  | US6   | Publish a valid event (see schema) to topic `leads.incoming` using the e2e helper `pnpm --filter @lead/e2e publish:lead`                       | Lead appears in the assigned salesperson's inbox within 1 minute; re-publishing the same `eventId` adds nothing |
| 3  | US6   | Publish an invalid event                                                                                                                       | No lead; one message on `leads.incoming.dlq`                                               |
| 4  | US1   | Sign in at http://localhost:3000/login as a seeded salesperson                                                                                 | Inbox shows only own leads, unread first/newest first, last 6 months, 20 per page          |
| 5  | US5   | Search `an`, `+84 90`, `0901234567`, `AN@MAIL`; set label filter; narrow dates                                                                | Matches in range only; combined filters apply; clearing restores the inbox                 |
| 6  | US2   | Open an unread lead; go back                                                                                                                   | Full details + activities; lead now shown as read; list/filters unchanged                  |
| 7  | US4   | Change label to SPAM then POTENTIAL                                                                                                            | Exactly one label; inbox shows the latest; lead's updated time moves                       |
| 8  | US3   | Add notes "Called customer" and "Sent promotion"                                                                                               | Newest on top, with author/time; no edit/delete controls; lead moves to top of its read group |
| 9  | Sec   | Sign in as the other salesperson and open the first lead's URL                                                                                 | "Lead not found" (404)                                                                     |
| 10 | Res   | `docker compose stop redis`, repeat scenario 4                                                                                                 | Still works (slower); `/api/v1/health` shows redis down                                    |

## 5. E2E suite

```powershell
pnpm test:e2e
```

Expected: Cucumber features under `end-to-end/features/leads/` pass; reports written to
`end-to-end/reports/`.

## Done when

- Steps 1, 2, and 5 are green; steps 3–4 behave as listed; no PII appears in `docker compose logs`
  for the three apps.
