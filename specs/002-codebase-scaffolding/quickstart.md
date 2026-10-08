# Quickstart: Validate the Scaffolding

Validation guide for the delivered boilerplate. Run after implementation (`/speckit-implement`).
Details: [plan.md](./plan.md), [contracts/](./contracts/), [data-model.md](./data-model.md).

## Prerequisites

- Node.js 24 (`node -v`)
- Docker with Compose (`docker --version`, `docker compose version`)
- pnpm via Corepack: `corepack enable` (version pinned by `packageManager`)

## 1. Workspace (Story 1)

```powershell
pnpm install
pnpm format:check; pnpm lint; pnpm typecheck; pnpm build
pnpm test
```

Expected: every command exits 0 with zero errors.

## 2. Backend (Stories 2, 4)

```powershell
copy .env.example .env
docker compose up -d mongo redis kafka --wait
pnpm --filter lead-service start:dev
curl http://localhost:3001/api/v1/health
pnpm --filter lead-service test:integration
```

Expected: `{"status":"ok","db":"up","redis":"up"}`; an invalid or unknown request returns
`{ statusCode, message, error }`; starting with `MONGODB_URI` unset exits with an error naming it.

## 3. Frontend (Story 3)

```powershell
pnpm --filter lead-web dev
```

Expected: `/login`, `/leads`, and `/leads/123` render shells in the shared layout; browser network
traffic and bundles contain no access token.

## 4. End-to-end (Story 5)

```powershell
docker compose up --build --wait
pnpm test:e2e
```

Expected: smoke scenarios pass; HTML and JSON reports appear in `end-to-end/reports/`.

## 5. Full containerized environment (Story 6)

```powershell
docker compose down -v
docker compose up --build --wait
docker compose ps
```

Expected: all services `healthy` within 3 minutes; images run as non-root.

## 6. CI (Story 6)

Open a pull request. Expected: `quality`, `e2e`, and docker build checks run and gate the PR; a merge
to `main` builds (and pushes) the three images.
