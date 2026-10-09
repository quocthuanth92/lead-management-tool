<!--
Sync Impact Report (temporary; remove before committing)
- Version change: (unversioned template) → 1.0.0
- Modified principles: none (initial adoption; all template placeholders replaced)
- Added principles: I. Clean & Hexagonal Architecture; II. AI-First Workflow (Verify Before
  Modify); III. Code Quality Gates; IV. Skills-First Implementation; V. Testing Policy
- Added sections: Technology & Architecture Constraints; Development Workflow & Quality Gates
- Removed sections: none
- Deferred TODOs:
  - TODO(PORT_PLACEMENT_RULES): docs/system-design-architecture.md does not yet explicitly
    document hexagonal boundaries or port placement rules; Principle I defers to that file as
    authoritative, so those rules MUST be added there.
-->
# Lead Management Tool Constitution

## Core Principles

### I. Clean & Hexagonal Architecture
The authoritative architecture rules live in `docs/system-design-architecture.md`. Code MUST be
organized into modular, reusable components with a clear separation of concerns between the
frontend (`apps/lead-web`) and the backend (`apps/lead-service`, `apps/lead-background-service`).
All new work MUST respect the current hexagonal boundaries and port placement rules; business
logic MUST NOT live in controllers, route handlers, or UI components. Any change that conflicts
with the architecture document MUST first amend that document.
Rationale: strict boundaries keep domain logic testable and let adapters (HTTP, MongoDB, Redis,
Kafka) change without rewriting business rules.

### II. AI-First Workflow: Verify Before Modification
Files, classes, modules, and dependencies MUST NOT be assumed to exist. Before modifying or
referencing any of them, the author (human or AI agent) MUST verify them against the repository
(search, read, or inspect). Imports and packages MUST be confirmed present in the relevant
manifest before use.
Rationale: unverified assumptions produce phantom APIs and broken builds.

### III. Code Quality Gates
Code MUST be formatted, linted, and free of TypeScript errors before it is committed. Commits
that fail the formatter, the linter, or the TypeScript compiler MUST NOT be made or merged.
Rationale: automated gates keep the monorepo consistently clean and the main branch buildable.

### IV. Skills-First Implementation
When implementing a specific layer of the tech stack (for example Next.js, NestJS, or MongoDB),
the relevant skills and instruction files MUST be fetched and read first, and only then may code
be generated for that layer.
Rationale: stack-specific guidance prevents inconsistent patterns and rework.

### V. Testing Policy (NON-NEGOTIABLE)
Tests are REQUIRED for behavior changes in the domain or application layers. Integration tests
are REQUIRED for REST, persistence, or security changes. A change in these areas MUST NOT be
considered complete until its tests exist and pass.
Rationale: domain and boundary behavior is where regressions are costliest.

## Technology & Architecture Constraints

- The repository is a monorepo built with `pnpm` and `turbo`; new package-level tasks MUST be
  registered in `turbo.json` and CI workflows.
- REST APIs MUST be exposed under `/api/v1` and validate all incoming requests.
- Environment-specific configuration MUST NOT be hard-coded.
- Product and technical specs live in `specs/*`; non-trivial features MUST have a relevant spec
  before implementation.

## Development Workflow & Quality Gates

- Before implementing, verify the affected files and dependencies exist (Principle II) and load
  the relevant stack skills (Principle IV).
- Before committing, run format, lint, and type-check for every affected package (Principle III).
- Pull requests MUST include the tests required by Principle V and MUST state which
  architecture-document rules the change relies on when it touches layer boundaries.
- Reviewers MUST reject changes that violate this constitution unless a justified amendment is
  proposed first.

## Governance

This constitution supersedes other development practices in this repository. Amendments MUST be
made by pull request that updates this file, states the rationale, bumps the version, and
includes a migration note for any in-flight work affected. Versioning follows semantic
versioning: MAJOR for backward-incompatible principle removals or redefinitions, MINOR for new
principles or materially expanded guidance, PATCH for clarifications and wording fixes. All pull
requests and reviews MUST verify compliance with this constitution, and any deviation MUST be
justified in the pull request. Runtime guidance lives in `.github/copilot-instructions.md`,
`.github/instructions/*`, and `docs/system-design-architecture.md`.

**Version**: 1.0.0 | **Ratified**: 2026-10-08 | **Last Amended**: 2026-10-08
