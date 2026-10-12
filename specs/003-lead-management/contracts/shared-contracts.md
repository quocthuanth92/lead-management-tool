# Shared Contracts: `@lead/shared-contracts` additions

Browser-safe package: **no** Node, Nest, or Mongoose imports. Existing exports (`API_PREFIX`,
`ErrorResponse`, health types) are unchanged. Everything below is exported from `src/index.ts`.
REST shapes are specified in [lead-service.openapi.yaml](./lead-service.openapi.yaml); the event in
[lead-ingest-event.schema.json](./lead-ingest-event.schema.json).

## Constants (single source of truth for enums and limits)

| Export                  | Value / meaning                                                                                                                              | Used by                                   |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `LEAD_LABELS`           | `['UNLABELED','POTENTIAL','SPAM'] as const`; `type LeadLabel`                                                                                | DTO enums, Mongoose enum, zod, web select |
| `DEFAULT_LEAD_LABEL`    | `'UNLABELED'`                                                                                                                                | writer, UI                                |
| `ACTIVITY_TYPES`        | `['CALL','EMAIL','SMS','NOTE','OTHER'] as const`; `type ActivityType`                                                                        | same                                      |
| `DEFAULT_ACTIVITY_TYPE` | `'NOTE'`                                                                                                                                     | DTO default, UI                           |
| `LEAD_SOURCES`          | `['INTERNAL','EXTERNAL'] as const`; `type LeadSource`                                                                                        | writer, details view                      |
| `LIMITS`                | `FULL_NAME_MAX=120, PHONE_MIN_DIGITS=7, PHONE_MAX_DIGITS=20, EMAIL_MAX=254, MESSAGE_MAX=2000, NOTE_MAX=2000, SEARCH_MIN=2, SEARCH_MAX=100`   | DTOs, zod, UI counters                    |
| `PAGINATION`            | `DEFAULT_PAGE=1, DEFAULT_LIMIT=20, MAX_LIMIT=200, ACTIVITIES_IN_DETAILS=50`                                                                  | DTOs, UI                                  |
| `DEFAULT_RANGE_MONTHS`  | `6`                                                                                                                                          | server default range, UI default          |
| `KAFKA_TOPICS`          | `LEADS_INCOMING='leads.incoming'`, `LEADS_DLQ='leads.incoming.dlq'` (defaults; overridable by env in apps)                                   | consumer, e2e publisher                   |

## Types

| Export                                          | Shape (see the OpenAPI schema of the same name)                                              |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `PagedResult<T>`                                | `{ items: T[]; page: number; limit: number; total: number }`                                  |
| `LeadListItem`                                  | `{ id, customerName, email?, phone, label, hasView, lastUpdate }` (ISO strings)              |
| `LeadActivityItem`                              | `{ id, leadId, type, content, authorName, createdAt }`                                       |
| `LeadDetails`                                   | list fields + `source, message, createdAt, activities: LeadActivityItem[], activitiesTotal`  |
| `LoginRequest`, `LoginResponse`, `SessionUser`  | auth shapes                                                                                  |

## Request types (implemented by lead-service DTO classes via `implements`)

| Export               | Fields                                                          |
| -------------------- | --------------------------------------------------------------- |
| `CreateLeadRequest`  | `fullName`, `phone`, `email?`, `message`                        |
| `ListLeadsQuery`     | `fromDate?`, `toDate?`, `page?`, `limit?`                       |
| `SearchLeadsQuery`   | `ListLeadsQuery` + `q?`, `label?` (at least one of `q`/`label`) |
| `SetLabelRequest`    | `label`                                                         |
| `AddActivityRequest` | `type?`, `content`                                              |

## Event contract

| Export                      | Description                                                                                                       |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `leadIngestEventSchema`     | zod schema matching `lead-ingest-event.schema.json` (built from the same `LIMITS`)                                |
| `LeadIngestEvent`           | `z.infer` type                                                                                                    |
| `parseLeadIngestEvent(raw)` | `{ success: true, data } \| { success: false, issues: string[] }`; issues contain paths/messages, never values    |
| `DeadLetterEnvelope`        | type matching `$defs/DeadLetterEnvelope`                                                                          |

## Rules

1. Types carry dates as ISO-8601 strings (JSON-safe); `Date` conversion happens at the edges.
2. A change to any constant or shape updates the OpenAPI/JSON Schema files in the same change; the parity
   test `packages/shared-contracts/src/contracts.parity.spec.ts` fails otherwise.
3. DTO classes and zod schemas import limits/enums from here; no literal duplicates.
4. `@lead/persistence` reuses `LEAD_LABELS`, `ACTIVITY_TYPES`, `LEAD_SOURCES` for its
   Mongoose enums (a Node package may depend on the browser-safe one, never the reverse).
