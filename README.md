# lead-management-tool

The Sales Lead Management Tool helps salespeople at the car dealership manage and track
leads coming from the dealership's website.

## Prerequisites

- Node.js 24 (`node -v`)
- Corepack enabled (`corepack enable`)
- Docker with Compose (`docker --version`, `docker compose version`)

## Workspace setup

```powershell
corepack enable
pnpm install
```

## Development commands

```powershell
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm format:check
```

## Local containers

```powershell
pnpm compose:up
pnpm compose:down
```

## End-to-end tests in containers

Runs the full stack and the Playwright/Cucumber suite inside Docker, the same way CI does:

```powershell
docker compose --profile e2e up --build --detach --wait --wait-timeout 600 mongo redis kafka lead-service lead-background-service lead-web
docker compose run --rm lead-service node dist/src/cli/seed.js
docker compose --profile e2e run --rm e2e
docker compose --profile e2e down --volumes --remove-orphans
```

Reports are written to `end-to-end/reports/` on the host.

## Validation command matrix

| Command | Result |
|---|---|
| `pnpm format:check` | PASS |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm build` | PASS |
| `pnpm test` | PASS |
| `pnpm test:integration` | PASS |
| `pnpm test:e2e` | Requires running stack (`docker compose up --build --wait`) and Playwright browser install |

## Applications

- `apps/lead-service`: NestJS API service
- `apps/lead-background-service`: NestJS Kafka background consumer
- `apps/lead-web`: Next.js web frontend
- `end-to-end`: Cucumber + Playwright smoke tests
- `packages/shared-contracts`: shared typed contracts
