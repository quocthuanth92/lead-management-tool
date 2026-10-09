# Copilot Instructions for Lead management tool platform

Lead management tool is a platform that helps salespeople at the car dealership manage and track leads coming from the dealership's website.

## Core Principles

- Follow clean architecture and spec-driven development.
- Keep business logic out of controllers, route handlers, and UI components.
- Prefer small, focused modules with explicit interfaces and dependency injection.
- Use typed contracts and shared packages for components reuse.
- Add or update tests for new domain logic, APIs, and critical integrations.
- Do not hard-code environment-specific configuration.
- Keep APIs contracts and browser-facing code clearly separated.

## Monorepo Structure

- `apps/lead-web`: lead web is nextjs website, prioritize client-rendered content.
- `apps/lead-service`: lead service is a NestJS backend service handling business logic of lead management.
- `apps/lead-background-service`: NestJS background service for async processing and scheduled tasks.
- `specs/*`: product and technical specs.
- `docs/*`: supporting documentation and architectural guidance.

## API Rules

- APIs must use `/api/v1`.
- Admin pages may access internal APIs only through server-side code.
- Validate all incoming requests.
- Map errors consistently using shared error contracts when available.

## Build and Development Rules

- Use `pnpm` for package management and `turbo` for monorepo builds.
- Before implementing non-trivial features, confirm that a relevant spec exists under `specs/*`.
- Keep controllers and route handlers thin.
- Keep business rules in domain/services/application layers.
- Update `turbo.json` and CI workflows when adding new package-level tasks.