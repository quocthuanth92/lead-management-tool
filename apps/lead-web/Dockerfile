FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@12.10.1 --activate

FROM base AS deps
COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json .npmrc ./
COPY packages ./packages
COPY apps/lead-web/package.json apps/lead-web/package.json
RUN pnpm install --frozen-lockfile=false --filter @lead/lead-web...

FROM base AS build
WORKDIR /app
COPY apps/lead-web ./apps/lead-web
RUN pnpm install --frozen-lockfile --prod=false --ignore-scripts
RUN pnpm --filter @lead/lead-web... run build

FROM base AS runtime
WORKDIR /app
ENV PORT=3000
ENV UV_THREADPOOL_SIZE=4
ENV NODE_OPTIONS=--max-old-space-size=512
RUN addgroup -S nextjs && adduser -S nodeuser -G nextjs
COPY --from=build /app/apps/lead-web/.next/standalone ./
COPY --from=build /app/apps/lead-web/.next/standalone/node_modules ./node_modules
COPY --from=build /app/apps/lead-web/.next ./.next
COPY --from=build /app/apps/lead-web/public ./public
COPY --from=build /app/apps/lead-web/.env.example ./.env
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]

