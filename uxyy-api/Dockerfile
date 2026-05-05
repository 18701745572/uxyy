# 构建阶段
FROM node:20-alpine AS builder

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm@9.15.0

# 复制 package 文件
COPY package.json pnpm-lock.yaml* ./
COPY uxyy-shared/package.json ./uxyy-shared/
COPY uxyy-api/package.json ./uxyy-api/

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY uxyy-shared/ ./uxyy-shared/
COPY uxyy-api/ ./uxyy-api/

# 构建共享包
RUN pnpm --filter uxyy-shared build

# 构建 API
RUN pnpm --filter uxyy-api build

# 生产阶段
FROM node:20-alpine AS production

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm@9.15.0

# 复制 package 文件
COPY package.json pnpm-lock.yaml* ./
COPY uxyy-shared/package.json ./uxyy-shared/
COPY uxyy-api/package.json ./uxyy-api/

# 安装生产依赖
RUN pnpm install --frozen-lockfile --prod

# 复制构建产物
COPY --from=builder /app/uxyy-shared/dist ./uxyy-shared/dist
COPY --from=builder /app/uxyy-api/dist ./uxyy-api/dist
COPY --from=builder /app/uxyy-api/drizzle ./uxyy-api/drizzle

WORKDIR /app/uxyy-api

EXPOSE 3000

CMD ["node", "dist/main.js"]
