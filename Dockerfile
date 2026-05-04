FROM node:20-bookworm-slim AS builder

WORKDIR /app
ENV CI=true

COPY package*.json ./
RUN npm ci

COPY apps/api/package*.json apps/api/
RUN cd apps/api && npm ci

COPY . .
RUN npm exec nx run api:build
RUN npm exec nx run frontend:build

FROM node:20-bookworm-slim AS api-runtime

WORKDIR /app/apps/api
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=1337

COPY --from=builder --chown=node:node /app/apps/api /app/apps/api
USER node
EXPOSE 1337
CMD ["npm", "run", "start"]

FROM node:20-bookworm-slim AS frontend-runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

COPY --from=builder --chown=node:node /app/package*.json /app/
COPY --from=builder --chown=node:node /app/node_modules /app/node_modules
COPY --from=builder --chown=node:node /app/dist/frontend /app/dist/frontend

USER node
EXPOSE 4000
CMD ["node", "dist/frontend/server/server.mjs"]
