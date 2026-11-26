# GymFinder API: Express + Mongoose on Node 22 (Alpine).
FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

# Install production dependencies first so this layer is cached between code changes.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY . .

# The official image ships an unprivileged "node" user.
USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-5000}/health" > /dev/null || exit 1

CMD ["node", "server.js"]
