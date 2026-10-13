# lead-management-tool

The Sales Lead Management Tool helps salespeople at the car dealership manage and track
leads coming from the dealership's website.

A salesperson signs in, sees only their own lead inbox (unread first, newest first, filterable by date
range, label and name/phone search), opens a lead to read its details and follow-up timeline, labels it
(for example `POTENTIAL` or `SPAM`) and records follow-up notes. Leads arrive through a
REST ingestion endpoint or a Kafka topic and are persisted by a background service.

## Contents

- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Build](#build)
- [Run](#run)
- [Test](#test)
- [Configuration](#configuration)
- [CI](#ci)
- [Project layout](#project-layout)
- [AI Collaboration Narrative](#ai-collaboration-narrative)

## Architecture

| Component                       | Role                                                                | Port |
| ------------------------------- | ------------------------------------------------------------------- | ---- |
| `apps/lead-web`                 | Next.js (App Router) frontend; talks to the API only from the server | 3000 |
| `apps/lead-service`             | NestJS REST API under `/api/v1` (auth, lead, details, labels, activities log) | 3001 |
| `apps/lead-background-service`  | NestJS Kafka consumer (`leads.incoming`, DLQ `leads.incoming.dlq`) and scheduled jobs | 3002 |
| MongoDB 7 (replica set `rs0`)   | System of record                                                    | 27017 |
| Redis                           | Cache and rate limiting                                             | 6379 |
| Kafka (KRaft)                   | Lead ingestion events                                               | 9092 |

Shared code lives in `packages/shared-contracts` (typed API/event contracts) and `packages/persistence`
(Mongoose schemas, normalization, idempotent lead writer). The authoritative architecture rules are in
[docs/system-design-architecture.md](docs/system-design-architecture.md).

## Prerequisites

- Node.js 24 (`node -v`; see `.nvmrc`)
- Corepack enabled (`corepack enable`), which provides the pinned `pnpm`
- Docker with Compose (`docker --version`, `docker compose version`). Required for the infrastructure
  containers, integration tests and end-to-end tests.

## Build

```powershell
corepack enable
pnpm install
pnpm build
```

`pnpm build` runs `turbo run build` and builds the shared packages first, then the three apps.

Quality gates (also enforced in CI):

```powershell
pnpm format:check   # Prettier (use `pnpm format` to fix)
pnpm lint
pnpm typecheck
```

## Run

### Option A - everything in Docker (simplest)

```powershell
pnpm compose:up
docker compose run --rm lead-service node dist/src/cli/seed.js
```

`compose:up` builds the images and starts MongoDB, Redis, Kafka and the three apps, waiting until all
health checks pass. The second command seeds the demo salespeople. Stop and delete volumes with
`pnpm compose:down`.

### Option B - infrastructure in Docker, apps on the host (hot reload)

```powershell
# 1. Create local env files from the examples (they are git-ignored)
Copy-Item apps\lead-service\.env.example apps\lead-service\.env
Copy-Item apps\lead-background-service\.env.example apps\lead-background-service\.env
Copy-Item apps\lead-web\.env.example apps\lead-web\.env

# 2. Start infrastructure only
docker compose up --wait mongo redis kafka

# 3. Seed demo salespeople, then start all apps through Turbo
pnpm --filter @lead/lead-service seed
pnpm dev
```

Individual apps: `pnpm lead-service:dev`, `pnpm lead-background-service:dev`, `pnpm lead-web:dev`.

### Using the application

| What                | Where                                                                  |
| ------------------- | ---------------------------------------------------------------------- |
| Web UI              | http://localhost:3000 (sign in at `/login`)                            |
| Swagger UI          | http://localhost:3001/api/v1/docs (OpenAPI JSON at `/api/v1/docs-json`) |
| Service health      | http://localhost:3001/api/v1/health                                    |
| Background health   | http://localhost:3002/health                                           |

Demo users are `sales.a@example.com` and `sales.b@example.com`; the password is the value of
`SEED_SALESPERSON_PASSWORD` in `apps/lead-service/.env` (or `.env.example` when using Docker).

Create a lead over REST (requires the `LEAD_SOURCE_API_KEY` value as `x-api-key`):

```powershell
curl -X POST http://localhost:3001/api/v1/leads `
  -H "x-api-key: please-change-this-api-key-min-32-chars" -H "Content-Type: application/json" `
  -d '{ "fullName": "Tran Van An", "phone": "+84 90 123 4567", "message": "Test drive please" }'
```

Publish a lead event to Kafka: `pnpm --filter @lead/e2e publish:lead`. Invalid events are routed to the
`leads.incoming.dlq` topic. More manual scenarios are in
[specs/003-lead-management/quickstart.md](specs/003-lead-management/quickstart.md).

## Test

| Command                | What it runs                                                                         | Needs Docker |
| ---------------------- | ------------------------------------------------------------------------------------ | ------------ |
| `pnpm test`            | Unit tests (Jest, with coverage) for all packages, both backends and lead-web        | No           |
| `pnpm test:integration`| Integration tests (REST, persistence, Kafka, security) using Testcontainers          | Yes          |
| `pnpm test:e2e`        | Cucumber + Playwright features in `end-to-end/features` against a running stack      | Yes          |

Run a single workspace with a Turbo filter, for example `pnpm --filter @lead/lead-service test`.

### End-to-end tests against a running stack on the host

Start the stack (Option A or B above, seeded), install the Playwright browser once
(`pnpm --filter @lead/e2e exec playwright install chromium`), then run `pnpm test:e2e`. Reports are written
to `end-to-end/reports/` (`cucumber-report.html` and `cucumber-report.json`).

### End-to-end tests in containers

Runs the full stack and the Playwright/Cucumber suite inside Docker, the same way CI does:

```powershell
docker compose --profile e2e up --build --detach --wait --wait-timeout 600 mongo redis kafka lead-service lead-background-service lead-web
docker compose run --rm lead-service node dist/src/cli/seed.js
docker compose --profile e2e run --rm e2e
docker compose --profile e2e down --volumes --remove-orphans
```

Reports are written to `end-to-end/reports/` on the host.

### Full local verification

```powershell
pnpm format:check; pnpm lint; pnpm typecheck; pnpm build; pnpm test; pnpm test:integration
```

## Configuration

Configuration comes from environment variables only; nothing environment-specific is hard-coded. Each
app has an `.env.example` (`apps/*/.env.example`, `end-to-end/.env.example`, plus a root `.env.example`
listing everything). The values in the examples are placeholders for local development and CI only; use
real secrets (`JWT_SECRET`, `LEAD_SOURCE_API_KEY`, `SEED_SALESPERSON_PASSWORD`) anywhere else. See
[specs/002-codebase-scaffolding/contracts/environment-variables.md](specs/002-codebase-scaffolding/contracts/environment-variables.md).

## CI

[.github/workflows/ci.yml](.github/workflows/ci.yml) runs format, lint, typecheck, build and unit tests on
every PR and push to `main`; on `main` it then builds the compose stack, seeds it, runs the end-to-end suite
and uploads the reports.

## Project layout

- `apps/lead-service`: NestJS API service
- `apps/lead-background-service`: NestJS Kafka background consumer
- `apps/lead-web`: Next.js web frontend
- `end-to-end`: Cucumber + Playwright tests
- `packages/shared-contracts`: shared typed contracts
- `packages/persistence`: shared Mongoose schemas and lead writer
- `specs/*`: product and technical specs (spec, plan, tasks, test plan, contracts)
- `docs/*`: architecture and supporting documentation

## AI Collaboration Narrative

This project uses [GitHub Spec Kit](https://github.com/github/spec-kit) to apply Spec-Driven Development
(SDD), with GitHub Copilot (agent mode in VS Code) as the coding partner. The guiding idea is that
**I own the intent, the architecture and the acceptance criteria; the AI does the typing, and I keep tight
control of its direction so it does not drift off course or add features that do not map to the spec.**

### 1. Strategy: guide the AI with specs and rules, not ad-hoc prompts


- **Architectural backbone and project constitution.** Authored [docs/system-design-architecture.md](docs/system-design-architecture.md) as the foundational backbone to explicitly define clean and hexagonal architecture boundaries across microservices, component layers, and database persistence (thin controllers, domain/application separation, ports and adapters, `/api/v1` conventions, and strict isolation between browser-facing UI and internal APIs). Built a binding project constitution ([.specify/memory/constitution.md](.specify/memory/constitution.md)) and guardrail rules so the AI operates within strict architectural bounds at all times.
- **Researched persistent instructions and domain skills.** Researched industry standards and community ecosystems—incorporating best practices from [awesome-copilot](https://awesome-copilot.github.com/), [skillsmp.com](https://skillsmp.com/), and [mongodb/agent-skills](https://github.com/mongodb/agent-skills). Codified repository-wide guidelines in [.github/copilot-instructions.md](.github/copilot-instructions.md), per-app standards in `.github/instructions/` (tailored for NestJS backend services and Next.js App Router frontend), and specialized MongoDB agent skills in `.github/skills/` (connection pooling, schema design, query optimization, and search). The constitution strictly enforces a "skills-first" workflow: the AI is mandated to fetch and apply the relevant domain skill *before* writing or modifying code for any layer.
- **Spec-driven development with Spec Kit.** Work started from a written constitution
  ([.specify/memory/constitution.md](.specify/memory/constitution.md)) and moved through the Spec Kit
  skills in `.github/skills`: specify, clarify, plan, tasks, analyze, implement. Each feature has a folder
  under `specs/` (`spec.md`, `plan.md`, `data-model.md`, `research.md`, `contracts/`, `tasks.md`,
  `test-plan.md`). The AI was always pointed at those artifacts instead of being given open-ended requests,
  so requirements, API contracts and the test plan were fixed before any code was generated.

- **Small, scoped increments.** Prompts were broken down by slice - scaffolding first (spec 002: monorepo,
  Docker Compose, CI), then the backend features (spec 003: code-first entities and repositories, inbox
  list with date filter and pagination, lead details with timeline and mark-as-viewed, labels, follow-up
  notes, search, and the background consumer), then the frontend - each with explicit scope notes such as
  "backend only, follow the architecture and testing docs".
- **Verify before modifying.** The AI was told not to assume files, classes or dependencies, and to read the
  existing code and the pinned tool versions (including Turborepo's version-specific docs, see `AGENTS.md`)
  before changing them.

### 2. Process: how I guided, verified, and refined AI output

- **Controlled phase planning and manual refinement:** Guided the initial breakdown using targeted prompt inputs to generate logical implementation phases, then manually reviewed and adjusted the plans until they met architectural expectations.
- **Manual task review and dependency ordering:** Inspected and reorganized generated tasks by hand to enforce execution order—deciding which foundation to build first and what followed—ensuring adherence to the overall system design.
- **Mandating shared packages first:** Explicitly prompted the agent to implement common modules (`packages/shared-contracts`, `packages/persistence`) first, establishing reusable schemas, contracts, and utilities across microservices rather than duplicating code.
- **Small-scoped, phased prompting:** Prompted the agent with small, single-phase increments from the task list rather than large batches. This minimized review scope, prevented AI drift, and made manual verification quick and focused.
- **Test-first scenarios and immediate verification:** Required the AI to write unit and integration test scenarios before implementing business logic, then immediately ran those test suites upon implementation to verify behavior against requirements.
- **Outlined E2E plan before test execution:** Structured an explicit outline and scenario plan for full-stack testing (Cucumber + Playwright) before having the agent write E2E steps, followed by a manual code review and verification of test run outputs.

### 3. Ensuring final quality

- **Strict automated gates:** Every change had to pass formatting (`prettier`), linting (`eslint`), static typing (`tsc`), and unit tests before being accepted.
- **Enforced coverage thresholds:** Maintained high coverage standards (≥90% lines and branches for domain and application layers, ≥80% for UI components) as defined in the constitution.
- **Contract-first consistency:** Centrally defined typed contracts in `packages/shared-contracts` kept the REST API, background consumer, and web frontend strictly aligned.
- **Real-world stack validation:** Validated critical flows against the running Docker Compose environment (MongoDB replica set, Redis, Kafka) using both integration tests and containerized E2E runs to prove end-to-end reliability.

### 4. Token and cost optimization: how I managed AI credits

- **Model tiering aligned with task strengths:** Reserved high-reasoning, deep-context models (such as Claude Sonnet and GPT-5-class models) for complex spec analysis, architectural design, and dependency task planning. Once atomic tasks were well-defined, switched to fast, cost-effective coding models (such as Claude Haiku, GPT-Codex and MAI-Code) to execute code changes at a fraction of the token cost.
- **Code intelligence and tailored instructions:** Leveraged code intelligence and graph-based indexing (such as codegraph) to eliminate expensive, brute-force repository file scans. Maintained concise, app-specific instructions (`.github/instructions/`) so the agent received targeted rules per tech stack (NestJS, Next.js) without wasting prompt tokens re-establishing basic context.
- **Layer-specific skills loaded on demand:** Curated and integrated domain-specific skill packs (such as `.github/skills/mongodb-*` for connection pooling, query optimization, and schema design), injecting specialized guidance only when working on that specific layer rather than bloating the global prompt context.
- **Context reuse and proactive compaction:** Grouped closely coupled tasks (such as writing unit test scenarios and their corresponding implementations) within the same session to reuse existing in-memory context and avoid redundant re-reads. Used context compaction before transitioning into implementation phases to clear obsolete reasoning history and keep token usage lean.
