FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS runtime
RUN apk add --no-cache tini curl
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --chown=node:node . .

USER node
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -fsS http://localhost:${PORT:-5000}/healthz || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "index.js"]
