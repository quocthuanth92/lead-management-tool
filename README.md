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
