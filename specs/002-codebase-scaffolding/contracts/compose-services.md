# Contract: docker-compose Services

Start the whole system: `docker compose up --build --wait` (exit 0 only when all services are healthy).

| Service                   | Image / build                                                                     | Host port | Healthcheck          | Depends on (healthy)       |
| ------------------------- | --------------------------------------------------------------------------------- | --------- | -------------------- | -------------------------- |
| `mongo`                   | `mongo` (replica set `rs0`, single node, init via `docker/mongo/init-replica.sh`) | 27017     | `rs.status()` ok     | none                       |
| `redis`                   | `redis:alpine`                                                                    | 6379      | `redis-cli ping`     | none                       |
| `kafka`                   | `apache/kafka` (KRaft, single node)                                               | 9092      | topics list succeeds | none                       |
| `lead-service`            | build `apps/lead-service/Dockerfile`                                              | 3001      | `GET /api/v1/health` | `mongo`, `redis`           |
| `lead-background-service` | build `apps/lead-background-service/Dockerfile`                                   | 3002      | `GET /health`        | `mongo`, `kafka`           |
| `lead-web`                | build `apps/lead-web/Dockerfile`                                                  | 3000      | `GET /api/health`    | `lead-service`             |
| `e2e` (profile `e2e`)     | build `end-to-end`                                                                | none      | none                 | `lead-web`, `lead-service` |

## Rules

- Config comes from environment variables / `.env`; no secrets are baked into images or committed.
- Runtime images run as a non-root user and contain only production dependencies.
- Named volumes persist `mongo` data; `docker compose down -v` resets state.
- Startup within 3 minutes on a clean machine with images already pulled (SC-003).
- Run E2E with `docker compose --profile e2e run --rm e2e`.
