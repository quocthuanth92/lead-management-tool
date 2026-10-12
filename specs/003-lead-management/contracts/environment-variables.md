# Environment Variables: Lead Management additions

Delta on [002 environment-variables](../../002-codebase-scaffolding/contracts/environment-variables.md).
All values are validated at startup (zod); missing/invalid values abort boot and name the variable. No
defaults for secrets. Every new key is added to the matching `.env.example` and to `docker-compose.yml`.

## lead-service

| Variable                  | Required | Default | Purpose                                                              |
| ------------------------- | -------- | ------- | -------------------------------------------------------------------- |
| `MONGODB_SYNC_INDEXES`    | no       | `true` outside production, `false` in production | Run `syncIndexes()` at boot (R-03)          |
| `CACHE_LIST_TTL_SECONDS`  | no       | `60`    | Inbox/search page cache TTL                                          |
| `CACHE_LEAD_TTL_SECONDS`  | no       | `300`   | Lead document cache TTL                                              |
| `SEED_SALESPERSON_PASSWORD` | seed only | none | Password used by the dev/E2E seed command (never read by the server) |

Existing and reused: `MONGODB_URI`, `REDIS_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `LEAD_SOURCE_API_KEY`,
`RATE_LIMIT_TTL`, `RATE_LIMIT_LIMIT`, `CORS_ORIGIN`.

## lead-background-service

| Variable                              | Required | Default | Purpose                                                    |
| ------------------------------------- | -------- | ------- | ---------------------------------------------------------- |
| `REDIS_URL`                           | yes      | none    | Cache invalidation after writes (failures tolerated)       |
| `CONSUMER_RETRY_ATTEMPTS`             | no       | `3`     | Attempts for transient failures before DLQ                 |
| `CONSUMER_RETRY_DELAY_MS`             | no       | `1000`  | Base delay, doubled per attempt                            |

Existing and reused: `MONGODB_URI`, `KAFKA_BROKERS`, `KAFKA_CLIENT_ID`, `KAFKA_GROUP_ID`,
`KAFKA_LEADS_TOPIC`, `KAFKA_LEADS_DLQ_TOPIC`. The handler must read the topic from validated config
(not `process.env` at decoration time) so tests can override it.

## lead-web (server-side only; none are `NEXT_PUBLIC_*`)

| Variable              | Required | Default        | Purpose                                              |
| --------------------- | -------- | -------------- | ---------------------------------------------------- |
| `LEAD_SERVICE_URL`    | yes      | none           | Base URL of lead-service including `/api/v1`          |
| `SESSION_COOKIE_NAME` | no       | `lead_session` | httpOnly cookie holding the access token             |
| `SESSION_COOKIE_SECURE` | no     | `true` in production | Sets the `Secure` attribute                    |

## end-to-end

| Variable             | Required | Default                 | Purpose                                              |
| -------------------- | -------- | ----------------------- | ---------------------------------------------------- |
| `E2E_SERVICE_URL`    | yes      | `http://localhost:3001` | lead-service base URL                                |
| `E2E_WEB_URL`        | yes      | `http://localhost:3000` | lead-web base URL                                    |
| `E2E_LEAD_API_KEY`   | yes      | none                    | Matches `LEAD_SOURCE_API_KEY` of the target stack    |
| `E2E_KAFKA_BROKERS`  | yes      | `localhost:9092`        | Host-side listener to publish test events            |
| `E2E_USER_A_EMAIL` / `E2E_USER_B_EMAIL` / `E2E_USER_PASSWORD` | yes | seed defaults | Salespeople created by the seed command |
