FROM node:24-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json .npmrc ./
COPY apps/lead-background-service/package.json apps/lead-background-service/package.json
COPY packages/shared-contracts/package.json packages/shared-contracts/package.json
RUN pnpm install --filter @lead/lead-background-service... --frozen-lockfile=false

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @lead/shared-contracts build
RUN pnpm --filter @lead/lead-background-service build

FROM node:24-alpine AS runtime
WORKDIR /app
RUN addgroup -S nodejs && adduser -S nodeuser -G nodejs
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/lead-background-service/dist ./dist
COPY --from=build /app/apps/lead-background-service/package.json ./package.json
USER nodeuser
EXPOSE 3002
CMD ["node", "dist/main.js"]
