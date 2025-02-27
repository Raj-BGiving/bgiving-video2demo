# syntax=docker.io/docker/dockerfile:1

FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Install ffmpeg, python3, and other required dependencies
RUN apk add --no-cache libc6-compat ffmpeg curl python3 && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json pnpm-lock.yaml* .npmrc* ./
RUN npm install -g pnpm && pnpm i --frozen-lockfile

# Builder stage for TypeScript compilation
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build TypeScript code
RUN npm install -g pnpm && pnpm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install required dependencies in the final stage
RUN apk add --no-cache ffmpeg curl python3 && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

# Add a non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

# Create necessary directories and set permissions
RUN mkdir -p /app/tmp /app/tmpsegments && \
    chown -R appuser:nodejs /app && \
    chmod -R 755 /app

# Copy only necessary files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/yt-cookies.txt ./yt-cookies.txt

# Ensure correct ownership of copied files
RUN chown -R appuser:nodejs /app

# Switch to non-root user
USER appuser

# Expose the port your Express server runs on
EXPOSE 8080

ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# Start the server using the compiled JavaScript
CMD ["node", "dist/index.js"]