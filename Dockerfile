FROM node:24-bookworm-slim AS build
ENV HUSKY=0
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@10.30.1 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json ./server/package.json
COPY app/package.json ./app/package.json
RUN pnpm install --filter server... --frozen-lockfile --ignore-scripts
COPY server ./server
RUN pnpm --filter server build

FROM build AS production-dependencies
RUN CI=true pnpm install --filter server... --prod --frozen-lockfile --ignore-scripts --offline

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app/server
COPY --from=production-dependencies --chown=node:node /workspace/node_modules /app/node_modules
COPY --from=production-dependencies --chown=node:node /workspace/server/node_modules ./node_modules
COPY --from=build --chown=node:node /workspace/server/dist ./dist
COPY --from=build --chown=node:node /workspace/server/drizzle ./drizzle
COPY --from=build --chown=node:node /workspace/server/package.json ./package.json
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
