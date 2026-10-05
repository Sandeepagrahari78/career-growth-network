FROM node:22-alpine AS build
WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/contracts/package.json packages/contracts/package.json
COPY services/health-demo/package.json services/health-demo/package.json
RUN pnpm install --frozen-lockfile
COPY services/health-demo services/health-demo
RUN pnpm --package=typescript@5.9.3 dlx tsc -p services/health-demo/tsconfig.json

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

# Runtime does not need npm/yarn/corepack. Removing package managers reduces
# attack surface and keeps vulnerable build tooling out of the shipped image.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /opt/yarn-v* \
  && rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
    /usr/local/bin/yarn /usr/local/bin/yarnpkg

COPY --from=build /repo/services/health-demo/dist ./dist
COPY --from=build /repo/services/health-demo/server.mjs ./server.mjs
USER node
EXPOSE 3001
CMD ["node", "server.mjs"]
