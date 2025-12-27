# Builder stage
FROM node:24-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches patches

RUN pnpm fetch

COPY . ./

# Install dependencies
RUN pnpm install -r --offline

WORKDIR apps/server

# Build the app
RUN pnpm build

RUN pnpm --filter . deploy deployed --legacy

# Runner stage
FROM denoland/deno:alpine AS runner

WORKDIR /app

# Copy built files from builder
COPY --from=builder /app/apps/server/deployed ./

# Expose port
EXPOSE 23456

# Run the server with Deno
CMD ["deno", "run", "--allow-net", "--allow-read", "--allow-write", "--allow-env", "--allow-ffi", "dist/server/index.mjs"]
