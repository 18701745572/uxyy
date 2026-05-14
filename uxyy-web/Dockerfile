# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9.15.0

# Copy workspace config
COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml* ./
COPY uxyy-shared/package.json ./uxyy-shared/
COPY uxyy-web/package.json ./uxyy-web/

# Install dependencies (ignore scripts until source code is copied)
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy source code
COPY uxyy-shared/ ./uxyy-shared/
COPY uxyy-web/ ./uxyy-web/

# Re-install to run prepare scripts
RUN pnpm install --frozen-lockfile

# Build shared package
RUN pnpm --filter @uxyy/shared build

# Build frontend - use cd and run next build directly with NODE_ENV
ENV API_URL=http://127.0.0.1:3000
ENV NODE_ENV=production
WORKDIR /app/uxyy-web
RUN sh node_modules/.bin/next build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9.15.0

# Copy workspace config
COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml* ./
COPY uxyy-shared/package.json ./uxyy-shared/
COPY uxyy-web/package.json ./uxyy-web/

# Create .npmrc to enable shamefully-hoist for production dependencies
RUN echo "shamefully-hoist=true" > .npmrc

# Install production dependencies, ignore scripts to avoid tsc not found error
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Copy built files from builder
COPY --from=builder /app/uxyy-shared/dist ./uxyy-shared/dist
COPY --from=builder /app/uxyy-shared/package.json ./uxyy-shared/
COPY --from=builder /app/uxyy-web/.next ./uxyy-web/.next
COPY --from=builder /app/uxyy-web/public ./uxyy-web/public
COPY --from=builder /app/uxyy-web/package.json ./uxyy-web/
COPY --from=builder /app/uxyy-web/next.config.mjs ./uxyy-web/

WORKDIR /app/uxyy-web

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["sh", "node_modules/.bin/next", "start"]
