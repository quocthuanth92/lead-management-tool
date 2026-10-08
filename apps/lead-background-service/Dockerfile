FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@12.10.1 --activate

FROM base AS deps
COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json .npmrc ./
COPY packages ./packages
COPY apps/lead-background-service/package.json apps/lead-background-service/package.json
RUN pnpm install --frozen-lockfile=false

FROM base AS build
WORKDIR /app
COPY apps/lead-background-service ./apps/lead-background-service
RUN pnpm install --frozen-lockfile --prod=false --ignore-scripts
RUN pnpm --filter @lead/lead-background-service... run build
RUN pnpm deploy --filter @lead/lead-background-service... --prod --legacy /prod/lead-background-service


FROM base AS runtime
WORKDIR /app
ENV PORT=9001
ENV UV_THREADPOOL_SIZE=4
ENV NODE_OPTIONS=--max-old-space-size=512
RUN addgroup -S nodejs && adduser -S nodeuser -G nodejs
COPY --from=build /prod/lead-background-service ./
COPY --from=build /app/apps/lead-background-service/.env.example ./.env
USER nodeuser
EXPOSE 9001
CMD ["node", "dist/main.js"]

