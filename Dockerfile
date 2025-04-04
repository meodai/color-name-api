# syntax=docker/dockerfile:1

ARG NODE_VERSION=21.5.0
ARG PORT=8080

FROM node:${NODE_VERSION}-alpine AS builder

WORKDIR /usr/src/app

# Copy package files for better caching
COPY package*.json ./

# Install dependencies with Railway-compatible cache mount
RUN --mount=type=cache,id=s/be505659-a9d6-46bd-8bdd-f1831627005c-/root/.npm,target=/root/.npm \
    npm ci --omit=dev

# Copy the rest of the application code
COPY . .

# Create a new stage for the runtime
FROM node:${NODE_VERSION}-alpine

ENV NODE_ENV=production

WORKDIR /usr/src/app

# Copy built application from builder stage
COPY --from=builder /usr/src/app ./

USER node

EXPOSE ${PORT}

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/v1/ || exit 1

CMD ["npm", "run", "start"]
