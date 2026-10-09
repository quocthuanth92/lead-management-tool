# Contract: GitHub Actions Pipelines

## `.github/workflows/ci.yml`

**Triggers**: `pull_request`, `push` to `main`. Concurrency group per ref, cancel in progress.
**Permissions**: `contents: read`.

### Job `quality` (ubuntu-latest)

1. Checkout
2. Setup Node 24 (from `.nvmrc`) + `corepack enable` (pnpm pinned by `packageManager`)
3. Restore pnpm store and Turbo cache
4. `pnpm install --frozen-lockfile`
5. `pnpm format:check`
6. `pnpm lint`
7. `pnpm typecheck`
8. `pnpm build`
9. `pnpm test` (unit)
10. `pnpm test:integration` (Testcontainers; Docker available on runner)

### Job `e2e` (needs `quality`)

1. Checkout, setup as above, install Playwright browsers
2. `docker compose up --build --wait`
3. `pnpm test:e2e`
4. Upload `end-to-end/reports` as artifact (`if: always()`)
5. `docker compose logs` on failure; `docker compose down -v` (`if: always()`)

## `.github/workflows/docker.yml`

**Triggers**: `push` to `main` (build + push), `pull_request` (build only).
**Permissions**: `contents: read`, `packages: write`.
**Matrix**: `lead-web`, `lead-service`, `lead-background-service`.
**Steps**: checkout, `docker/setup-buildx-action`, (main only) `docker/login-action` to GHCR with
`GITHUB_TOKEN`, then `docker/build-push-action` with GHA layer cache; tags `sha-<short>` and `latest`
on main.

## Required status checks (branch protection, configured by a repo admin)

`quality`, `e2e`, and the `docker` matrix builds.

## Keeping in sync

Any new package-level task MUST be added to `turbo.json` and to the relevant job above in the same
change (project build rule).
