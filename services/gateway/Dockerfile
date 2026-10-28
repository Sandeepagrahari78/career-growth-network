FROM node:22-alpine AS build

WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate
COPY . .
RUN pnpm install --filter @cgn/gateway... --frozen-lockfile
RUN pnpm --filter @cgn/gateway build
RUN pnpm --filter @cgn/gateway deploy --prod --legacy /prod

FROM node:22-alpine

ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
COPY --from=build --chown=node:node /prod/ ./
USER node
EXPOSE 3000
STOPSIGNAL SIGTERM
CMD ["node", "dist/main.js"]
