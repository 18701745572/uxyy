# 构建阶段
FROM node:20-alpine AS builder

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm@9.15.0

# 复制 package 文件
COPY package.json pnpm-lock.yaml* ./
COPY uxyy-shared/package.json ./uxyy-shared/
COPY uxyy-web/package.json ./uxyy-web/

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY uxyy-shared/ ./uxyy-shared/
COPY uxyy-web/ ./uxyy-web/

# 构建共享包
RUN pnpm --filter uxyy-shared build

# 构建前端
RUN pnpm --filter uxyy-web build

# 生产阶段
FROM node:20-alpine AS production

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm@9.15.0

# 复制 package 文件
COPY package.json pnpm-lock.yaml* ./
COPY uxyy-shared/package.json ./uxyy-shared/
COPY uxyy-web/package.json ./uxyy-web/

# 安装生产依赖
RUN pnpm install --frozen-lockfile --prod

# 复制构建产物
COPY --from=builder /app/uxyy-shared/dist ./uxyy-shared/dist
COPY --from=builder /app/uxyy-web/.next ./uxyy-web/.next
COPY --from=builder /app/uxyy-web/public ./uxyy-web/public
COPY --from=builder /app/uxyy-web/package.json ./uxyy-web/package.json

WORKDIR /app/uxyy-web

EXPOSE 3001

CMD ["pnpm", "start"]
