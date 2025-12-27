# Builder stage
FROM node:24-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

COPY . ./

# Install dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

WORKDIR apps/server

# Build the app
RUN pnpm build

# Runner stage
FROM denoland/deno:alpine AS runner

WORKDIR /app

# Copy built files from builder
COPY --from=builder /app/apps/server/dist ./dist

# Expose port
EXPOSE 23456

# Run the server with Deno
CMD ["deno", "run", "--allow-net", "--allow-read", "--allow-write", "dist/server/index.mjs"]
