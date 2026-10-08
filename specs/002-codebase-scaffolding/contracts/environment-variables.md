# Contract: Environment Variables

Values below are documented in `.env.example` (no real secrets committed). All are validated at boot;
a missing or invalid key aborts startup naming the key.

## lead-service

| Variable                              | Required | Example / default                | Notes                                   |
| ------------------------------------- | -------- | -------------------------------- | --------------------------------------- |
| `NODE_ENV`                            | yes      | `development`                    | `development` \| `test` \| `production` |
| `PORT`                                | yes      | `3001`                           |                                         |
| `MONGODB_URI`                         | yes      | `mongodb://localhost:27017/lead` |                                         |
| `REDIS_URL`                           | yes      | `redis://localhost:6379`         |                                         |
| `JWT_SECRET`                          | yes      | (none)                           | At least 32 chars outside `test`        |
| `JWT_EXPIRES_IN`                      | no       | `1h`                             |                                         |
| `LEAD_SOURCE_API_KEY`                 | yes      | (none)                           | For `x-api-key` ingest, wired later     |
| `RATE_LIMIT_TTL` / `RATE_LIMIT_LIMIT` | no       | `60` / `100`                     | Throttler defaults                      |
| `CORS_ORIGIN`                         | no       | `http://localhost:3000`          |                                         |

## lead-background-service

| Variable                | Required | Example / default         | Notes             |
| ----------------------- | -------- | ------------------------- | ----------------- |
| `NODE_ENV`, `PORT`      | yes      | `3002`                    | Health HTTP port  |
| `MONGODB_URI`           | yes      | same as above             |                   |
| `KAFKA_BROKERS`         | yes      | `localhost:9092`          | Comma-separated   |
| `KAFKA_CLIENT_ID`       | no       | `lead-background-service` |                   |
| `KAFKA_GROUP_ID`        | no       | `lead-consumer`           |                   |
| `KAFKA_LEADS_TOPIC`     | no       | `leads.incoming`          | Placeholder name  |
| `KAFKA_LEADS_DLQ_TOPIC` | no       | `leads.incoming.dlq`      | Dead-letter topic |

## lead-web

| Variable               | Scope       | Example                 | Notes                             |
| ---------------------- | ----------- | ----------------------- | --------------------------------- |
| `LEAD_SERVICE_URL`     | server only | `http://localhost:3001` | Never prefixed `NEXT_PUBLIC_`     |
| `SESSION_COOKIE_NAME`  | server only | `lead_session`          | httpOnly cookie holding the token |
| `NEXT_PUBLIC_APP_NAME` | public      | `Lead Management`       | Inlined at build time             |

## end-to-end

| Variable       | Example                 |
| -------------- | ----------------------- |
| `WEB_BASE_URL` | `http://localhost:3000` |
| `API_BASE_URL` | `http://localhost:3001` |
| `HEADLESS`     | `true`                  |

## docker-compose

Compose supplies container-network values (`mongo`, `redis`, `kafka` hostnames) and reads host port
overrides from the root `.env`.
