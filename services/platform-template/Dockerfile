FROM node:22-alpine AS build

WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate
COPY . .
RUN pnpm install --filter @cgn/platform-template... --frozen-lockfile
RUN pnpm --filter @cgn/platform-template build
RUN pnpm --filter @cgn/platform-template deploy --prod --legacy /prod

FROM node:22-alpine

ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /prod/ ./
USER node
EXPOSE 3000
STOPSIGNAL SIGTERM
CMD ["node", "dist/main.js"]
