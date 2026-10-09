# Tasks: Codebase Scaffolding

**Input**: Design documents from `/specs/002-codebase-scaffolding/`

**Prerequisites**: [plan.md](./plan.md) (required), [spec.md](./spec.md) (required for user stories), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: Tests are included because the specification explicitly requires unit, integration, and end-to-end validation.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (US1, US2, US3, ...)
- Every task includes an exact file path

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize monorepo tooling and baseline repository configuration shared by all stories.

- [X] T001 Create root workspace manifest, scripts, and package manager pinning in package.json
- [X] T002 Create workspace membership definitions in pnpm-workspace.yaml
- [X] T003 Create Turbo task pipeline for build/lint/typecheck/test/test:integration/test:e2e in turbo.json
- [X] T004 [P] Create shared TypeScript base configuration in tsconfig.base.json
- [X] T005 [P] Create shared ESLint flat configuration in eslint.config.mjs
- [X] T006 [P] Create Prettier and editor baseline config in .prettierrc.json, .prettierignore, and .editorconfig
- [X] T007 [P] Create runtime/version tooling files in .nvmrc and .npmrc
- [X] T008 Create repository-wide environment template documentation in .env.example
- [X] T009 [P] Update ignored files for Node/build/test artifacts in .gitignore

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build shared contracts and cross-project foundations that block all user-story implementation.

**âš ï¸ CRITICAL**: No user story implementation begins until this phase is complete.

- [X] T010 Create shared contracts package metadata and build scripts in packages/shared-contracts/package.json
- [X] T011 [P] Create shared contracts TypeScript config in packages/shared-contracts/tsconfig.json
- [X] T012 [P] Create API prefix constant export in packages/shared-contracts/src/api/constants.ts
- [X] T013 [P] Create canonical error response contract in packages/shared-contracts/src/errors/error-response.ts
- [X] T014 [P] Create shared health response types in packages/shared-contracts/src/health/health-response.ts
- [X] T015 Create shared-contracts public export barrel in packages/shared-contracts/src/index.ts
- [X] T016 [P] Create repository README scaffolding runbook (install/build/test/containerize) in README.md
- [X] T017 Create root-level scripts wiring for per-workspace commands in package.json
- [X] T018 Create app-level folder skeletons for services and web app in apps/lead-service, apps/lead-background-service, and apps/lead-web
- [X] T019 Create end-to-end project folder skeleton in end-to-end/package.json, end-to-end/tsconfig.json, and end-to-end/cucumber.mjs

**Checkpoint**: Foundation ready; user story phases can proceed.

---

## Phase 3: User Story 1 - Monorepo workspace and shared tooling (Priority: P1) ðŸŽ¯ MVP

**Goal**: A clean clone can install and run workspace-wide build and quality gates successfully.

**Independent Test**: On a clean machine run `pnpm install`, then `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, and `pnpm build`; all pass with zero errors.

### Tests for User Story 1

- [X] T020 [P] [US1] Add root workspace smoke command verification test script in package.json
- [X] T021 [P] [US1] Add shared-contracts unit smoke test to verify package compilation in packages/shared-contracts/src/index.spec.ts

### Implementation for User Story 1

- [X] T022 [US1] Configure workspace dependencies and task runners for all members in package.json and pnpm-workspace.yaml
- [X] T023 [P] [US1] Configure TypeScript project references for all workspace members in tsconfig.base.json
- [X] T024 [P] [US1] Configure lint targets and ignore patterns for workspace members in eslint.config.mjs
- [X] T025 [US1] Configure root build/lint/typecheck/test scripts mapped to Turbo tasks in package.json
- [X] T026 [US1] Document clean-clone bootstrap and quality-gate commands in README.md

**Checkpoint**: User Story 1 is independently functional and validates shared tooling.

---

## Phase 4: User Story 2 - Lead service boilerplate (Priority: P1)

**Goal**: `apps/lead-service` provides a hexagonal NestJS skeleton with `/api/v1/health`, global validation, and shared error mapping.

**Independent Test**: Start lead-service with backing services and call `/api/v1/health`; run unit tests and integration tests for health/error-shape/config validation.

### Tests for User Story 2

- [X] T027 [P] [US2] Add lead-service bootstrap unit test for global prefix and pipes in apps/lead-service/src/main.spec.ts
- [X] T028 [P] [US2] Add health module unit test for response shape `{ status, db, redis }` in apps/lead-service/src/modules/health/health.service.spec.ts
- [X] T029 [P] [US2] Add integration test for GET /api/v1/health in apps/lead-service/test/integration/health.e2e-spec.ts
- [X] T030 [P] [US2] Add integration test asserting `{ statusCode, message, error }` error contract in apps/lead-service/test/integration/error-contract.e2e-spec.ts
- [X] T031 [P] [US2] Add integration test asserting invalid env fails fast with named key in apps/lead-service/test/integration/config-validation.e2e-spec.ts

### Implementation for User Story 2

- [X] T032 [P] [US2] Create lead-service package, Nest CLI, tsconfig, and test config in apps/lead-service/package.json, apps/lead-service/nest-cli.json, apps/lead-service/tsconfig.json, and apps/lead-service/jest.config.ts
- [X] T033 [P] [US2] Create lead-service bootstrap and root module wiring in apps/lead-service/src/main.ts and apps/lead-service/src/app.module.ts
- [X] T034 [P] [US2] Create global exception filter mapping to shared error response in apps/lead-service/src/common/filters/all-exceptions.filter.ts
- [X] T035 [P] [US2] Create validated config module and schema in apps/lead-service/src/core/config/config.module.ts and apps/lead-service/src/core/config/env.schema.ts with constraints quoted from data-model: "ports are integers 1â€“65535; URIs must parse; secrets (JWT, API key) must be non-empty and at least 32 characters outside `test`"
- [X] T036 [P] [US2] Create database wiring via Mongoose module in apps/lead-service/src/core/database/database.module.ts
- [X] T037 [P] [US2] Create Redis provider module with resilient connection handling in apps/lead-service/src/core/redis/redis.module.ts
- [X] T038 [US2] Create health module/controller/service implementing GET /api/v1/health in apps/lead-service/src/modules/health/health.module.ts, apps/lead-service/src/modules/health/health.controller.ts, and apps/lead-service/src/modules/health/health.service.ts
- [X] T039 [P] [US2] Create auth skeleton module and placeholders in apps/lead-service/src/modules/auth/auth.module.ts and apps/lead-service/src/modules/auth/guards/auth.guard.ts
- [X] T040 [P] [US2] Create users skeleton module in apps/lead-service/src/modules/users/users.module.ts
- [X] T041 [P] [US2] Create leads hexagonal skeleton (domain/application/infrastructure/interface) in apps/lead-service/src/modules/leads/\*\*
- [X] T042 [P] [US2] Create lead-activities hexagonal skeleton (domain/application/infrastructure/interface) in apps/lead-service/src/modules/leads/\*\*
- [X] T043 [P] [US2] Create cache module skeleton and Redis adapter port wiring in apps/lead-service/src/modules/cache/\*\*
- [X] T044 [US2] Create/align health endpoint contract file in specs/002-codebase-scaffolding/contracts/lead-service-health.openapi.yaml
- [X] T045 [US2] Create/align error-response schema contract file in specs/002-codebase-scaffolding/contracts/error-response.schema.json

**Checkpoint**: User Story 2 independently passes health, validation, and error-shape requirements.

---

## Phase 5: User Story 3 - Lead web boilerplate (Priority: P1)

**Goal**: `apps/lead-web` exposes route shells and server-side-only access to lead-service.

**Independent Test**: Run `lead-web` and validate `/login`, `/leads`, `/leads/[id]` shells and server-only API access pattern.

### Tests for User Story 3

- [X] T046 [P] [US3] Add route rendering tests for login/inbox/details shells in apps/lead-web/src/app/app-shell.routes.test.tsx
- [X] T047 [P] [US3] Add test proving server-only lead-service client usage in apps/lead-web/src/lib/server/lead-service-client.test.ts

### Implementation for User Story 3

- [X] T048 [P] [US3] Create lead-web package and framework configs in apps/lead-web/package.json, apps/lead-web/next.config.ts, apps/lead-web/tsconfig.json, and apps/lead-web/jest.config.ts
- [X] T049 [P] [US3] Create root app layout/providers/global styles in apps/lead-web/src/app/layout.tsx, apps/lead-web/src/app/providers.tsx, and apps/lead-web/src/app/globals.css
- [X] T050 [P] [US3] Create auth and app route groups with shell pages in apps/lead-web/src/app/(auth)/login/page.tsx, apps/lead-web/src/app/(app)/leads/page.tsx, and apps/lead-web/src/app/(app)/leads/[id]/page.tsx
- [X] T051 [P] [US3] Create server-only lead-service client and cookie/session helpers in apps/lead-web/src/lib/server/lead-service-client.ts and apps/lead-web/src/lib/server/session.ts
- [X] T052 [P] [US3] Create BFF health/proxy route handlers in apps/lead-web/src/app/api/health/route.ts and apps/lead-web/src/app/api/lead-service/[...path]/route.ts
- [X] T053 [US3] Create React Query client setup for client-rendered pages in apps/lead-web/src/lib/query/query-client.ts
- [X] T054 [US3] Create request interception/auth middleware placeholder in apps/lead-web/src/proxy.ts

**Checkpoint**: User Story 3 independently runs and satisfies server-only token handling expectations.

---

## Phase 6: User Story 4 - Background service boilerplate (Priority: P2)

**Goal**: `apps/lead-background-service` exposes Kafka consumer skeleton, retry/DLQ placeholders, and health checks.

**Independent Test**: Start service with broker/database and verify health plus consumer module bootstrap.

### Tests for User Story 4

- [X] T055 [P] [US4] Add background-service bootstrap unit test for hybrid transport startup in apps/lead-background-service/src/main.spec.ts
- [X] T056 [P] [US4] Add health module unit test for broker/database status shape in apps/lead-background-service/src/modules/health/health.service.spec.ts

### Implementation for User Story 4

- [X] T057 [P] [US4] Create background-service package and Nest configs in apps/lead-background-service/package.json, apps/lead-background-service/nest-cli.json, apps/lead-background-service/tsconfig.json, and apps/lead-background-service/jest.config.ts
- [X] T058 [P] [US4] Create hybrid bootstrap and root app module in apps/lead-background-service/src/main.ts and apps/lead-background-service/src/app.module.ts
- [X] T059 [P] [US4] Create config module with broker/database env validation in apps/lead-background-service/src/core/config/config.module.ts and apps/lead-background-service/src/core/config/env.schema.ts
- [X] T060 [P] [US4] Create health module/controller/service in apps/lead-background-service/src/modules/health/health.module.ts, apps/lead-background-service/src/modules/health/health.controller.ts, and apps/lead-background-service/src/modules/health/health.service.ts
- [X] T061 [US4] Create lead-consumer hexagonal skeleton with retry/DLQ placeholders in apps/lead-background-service/src/modules/lead-consumer/\*\*

**Checkpoint**: User Story 4 independently boots and reports health with consumer scaffolding.

---

## Phase 7: User Story 5 - End-to-end test project (Priority: P2)

**Goal**: Cucumber (Gherkin) + Playwright smoke tests validate web shell and service health.

**Independent Test**: Bring up composed environment and run end-to-end suite with generated reports.

### Tests for User Story 5

- [X] T062 [P] [US5] Create Cucumber feature for web login page smoke in end-to-end/features/smoke/web.feature
- [X] T063 [P] [US5] Create Cucumber feature for service health smoke in end-to-end/features/smoke/service-health.feature
- [X] T064 [P] [US5] Create Playwright-backed step definitions for web smoke in end-to-end/step-definitions/web.steps.ts
- [X] T065 [P] [US5] Create Playwright-backed step definitions for service health smoke in end-to-end/step-definitions/service.steps.ts

### Implementation for User Story 5

- [X] T066 [P] [US5] Configure Cucumber runner, formatters, and TypeScript execution in end-to-end/cucumber.mjs and end-to-end/package.json
- [X] T067 [P] [US5] Create Cucumber world/hooks/support utilities in end-to-end/support/world.ts, end-to-end/support/hooks.ts, and end-to-end/support/config.ts
- [X] T068 [US5] Create HTTP helper for service assertions in end-to-end/support/api-client.ts
- [X] T069 [US5] Create end-to-end env template for base URLs and headless mode in end-to-end/.env.example

**Checkpoint**: User Story 5 independently executes smoke suite and emits reports.

---

## Phase 8: User Story 6 - Containerized local environment and CI/CD (Priority: P2)

**Goal**: One command starts healthy local stack; CI/CD enforces quality gates and builds images.

**Independent Test**: `docker compose up --build --wait` reaches healthy state; PR pipelines run required jobs.

### Tests for User Story 6

- [X] T070 [P] [US6] Add compose smoke verification script for healthy services in scripts/verify-compose-health.mjs
- [X] T071 [P] [US6] Add CI workflow lint/test dry-run validation for workflow syntax in .github/workflows/ci.yml and .github/workflows/docker.yml

### Implementation for User Story 6

- [X] T072 [P] [US6] Create lead-service container build definition in apps/lead-service/Dockerfile
- [X] T073 [P] [US6] Create lead-background-service container build definition in apps/lead-background-service/Dockerfile
- [X] T074 [P] [US6] Create lead-web container build definition in apps/lead-web/Dockerfile
- [X] T075 [P] [US6] Create end-to-end container build definition in end-to-end/Dockerfile
- [X] T076 [P] [US6] Create Mongo replica-set init script in docker/mongo/init-replica.sh
- [X] T077 [US6] Implement full compose stack with health checks and dependencies in docker-compose.yml
- [X] T078 [US6] Implement CI quality and E2E pipeline workflow in .github/workflows/ci.yml
- [X] T079 [US6] Implement Docker image build/push workflow in .github/workflows/docker.yml
- [X] T080 [US6] Align environment-variable contract with implemented app/env keys in specs/002-codebase-scaffolding/contracts/environment-variables.md
- [X] T081 [US6] Align compose-service contract with implemented services and health checks in specs/002-codebase-scaffolding/contracts/compose-services.md
- [X] T082 [US6] Align CI-pipeline contract with implemented workflow jobs and checks in specs/002-codebase-scaffolding/contracts/ci-pipeline.md

**Checkpoint**: User Story 6 independently provides reproducible local environment and automated CI/CD gates.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final consistency, documentation, and cross-story validation.

- [X] T083 [P] Update feature quickstart validation steps to match final scripts and commands in specs/002-codebase-scaffolding/quickstart.md
- [X] T084 [P] Update implementation plan references where file layout changed during execution in specs/002-codebase-scaffolding/plan.md
- [X] T085 [P] Add root-level convenience scripts for common workflows (dev/build/test/e2e/compose) in package.json
- [X] T086 Run end-to-end feature validation checklist and record outcomes in specs/002-codebase-scaffolding/checklists/requirements.md
- [X] T087 Execute final quality gates (format, lint, typecheck, unit, integration, e2e) and capture command matrix in README.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: no dependencies; starts immediately.
- **Phase 2 (Foundational)**: depends on Phase 1; blocks all user stories.
- **Phases 3-8 (User Stories)**: depend on Phase 2.
  - P1 stories first (US1, US2, US3).
  - P2 stories after P1 baseline (US4, US5, US6), with US5 depending on US2+US3 and US6 depending on US2+US3+US4.
- **Phase 9 (Polish)**: depends on all completed stories targeted for release.

### User Story Dependencies

- **US1**: depends only on Foundational.
- **US2**: depends only on Foundational.
- **US3**: depends on Foundational and shared contracts from Phase 2.
- **US4**: depends on Foundational.
- **US5**: depends on US2 (service health endpoint) and US3 (web routes).
- **US6**: depends on US2, US3, and US4 deliverables for Docker/CI composition.

### Within Each User Story

- Tests first, then implementation.
- Module/package scaffolding before feature-specific wiring.
- Contract alignment tasks run after implementation details settle.
- Story checkpoint must pass before moving to lower priority work.

### Parallel Opportunities

- Phase 1: T004-T007 and T009 can run in parallel after T001-T003.
- Phase 2: T011-T014 and T016 can run in parallel once T010 is done.
- US2: T032-T037 and T039-T043 are parallelizable, then converge on T038/T044/T045.
- US3: T048-T052 can run in parallel, then converge on T053/T054.
- US4: T057-T060 can run in parallel before T061.
- US5: T062-T067 can run in parallel, then converge on T068/T069.
- US6: T072-T076 can run in parallel, then converge on T077-T082.

---

## Parallel Example: User Story 2

```bash
# Run lead-service infrastructure tasks in parallel:
Task: "T035 Create validated config module in apps/lead-service/src/core/config/config.module.ts and apps/lead-service/src/core/config/env.schema.ts"
Task: "T036 Create database wiring in apps/lead-service/src/core/database/database.module.ts"
Task: "T037 Create Redis provider module in apps/lead-service/src/core/redis/redis.module.ts"

# Run module skeleton tasks in parallel:
Task: "T039 Create auth skeleton module in apps/lead-service/src/modules/auth/auth.module.ts"
Task: "T041 Create leads hexagonal skeleton in apps/lead-service/src/modules/leads/**"
Task: "T042 Create lead-activities hexagonal skeleton in apps/lead-service/src/modules/leads/**"
```

---

## Parallel Example: User Story 6

```bash
# Build per-component Dockerfiles in parallel:
Task: "T072 Create apps/lead-service/Dockerfile"
Task: "T073 Create apps/lead-background-service/Dockerfile"
Task: "T074 Create apps/lead-web/Dockerfile"
Task: "T075 Create end-to-end/Dockerfile"
```

---

## Implementation Strategy

### MVP First (User Stories 1-3)

1. Complete Phase 1 (Setup).
2. Complete Phase 2 (Foundational).
3. Complete Phase 3 (US1) to guarantee workspace install/build/quality gates.
4. Complete Phase 4 (US2) to establish backend foundation and health contract.
5. Complete Phase 5 (US3) to establish frontend shells and server-side boundary.
6. Validate MVP checkpoints before moving to P2 stories.

### Incremental Delivery

1. Add US4 for background-service skeleton.
2. Add US5 for executable end-to-end harness.
3. Add US6 for compose + CI/CD automation.
4. Finish with Phase 9 polish and full-quality validation.

### Team Parallel Strategy

1. Team completes Phases 1-2 together.
2. Then split:
   - Developer A: US2
   - Developer B: US3
   - Developer C: US4
3. US5 starts when US2+US3 are ready; US6 starts when US2+US3+US4 are ready.

---

## Notes

- All tasks use strict checklist format: checkbox + ID + optional `[P]` + required `[US#]` on story phases + exact path.
- Tests are included because they are explicitly required by the feature specification and constitution.
- Business behavior is intentionally excluded per FR-016.
