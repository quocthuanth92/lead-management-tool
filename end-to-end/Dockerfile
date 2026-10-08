FROM node:24-alpine AS base
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json .npmrc ./
COPY end-to-end/package.json end-to-end/package.json
RUN pnpm install --filter @lead/e2e... --frozen-lockfile=false

COPY end-to-end ./end-to-end
WORKDIR /app/end-to-end
CMD ["pnpm", "test:e2e"]
