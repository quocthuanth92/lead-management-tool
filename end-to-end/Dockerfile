FROM node:24-bookworm-slim AS base
WORKDIR /app
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN corepack enable

COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json .npmrc ./
COPY end-to-end/package.json end-to-end/package.json
RUN pnpm install --filter @lead/e2e... --frozen-lockfile=false
# Playwright does not support Alpine (musl), so the image is Debian-based and installs Chromium with its system libraries.
RUN pnpm --filter @lead/e2e exec playwright install --with-deps chromium

COPY end-to-end ./end-to-end
WORKDIR /app/end-to-end
CMD ["pnpm", "test:e2e"]
