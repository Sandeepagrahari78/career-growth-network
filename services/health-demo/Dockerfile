FROM node:22-alpine AS build
WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/contracts/package.json packages/contracts/package.json
COPY services/health-demo/package.json services/health-demo/package.json
RUN pnpm install --frozen-lockfile
COPY services/health-demo services/health-demo
RUN pnpm dlx typescript@5.9.3 tsc -p services/health-demo/tsconfig.json

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
COPY --from=build /repo/services/health-demo/dist ./dist
COPY --from=build /repo/services/health-demo/server.mjs ./server.mjs
USER node
EXPOSE 3001
CMD ["node", "server.mjs"]
