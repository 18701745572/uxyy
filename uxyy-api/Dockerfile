# 多阶段构建
FROM node:20-alpine AS builder

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm@9.15.0

# 复制 workspace 配置
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml* ./

# 复制所有子包的 package.json
COPY uxyy-shared/package.json ./uxyy-shared/
COPY uxyy-api/package.json ./uxyy-api/
COPY uxyy-web/package.json ./uxyy-web/

# 安装所有依赖（忽略脚本）
RUN pnpm install --frozen-lockfile --ignore-scripts

# 复制源代码
COPY uxyy-shared/ ./uxyy-shared/
COPY uxyy-api/ ./uxyy-api/

# 重新安装并运行脚本
RUN pnpm install --frozen-lockfile

# 构建共享包
RUN pnpm --filter @uxyy/shared build

# 构建 API
RUN pnpm --filter @uxyy/api build

# 生产阶段 - 使用 shamefully-hoist 确保依赖可用
FROM node:20-alpine AS production

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm@9.15.0

# 复制 workspace 配置和 package.json
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml* ./
COPY uxyy-shared/package.json ./uxyy-shared/
COPY uxyy-api/package.json ./uxyy-api/
COPY uxyy-web/package.json ./uxyy-web/

# 创建 .npmrc 启用 shamefully-hoist，确保所有依赖都被提升到 node_modules
RUN echo "shamefully-hoist=true" > .npmrc

# 只安装生产依赖，忽略脚本
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# 复制构建产物
COPY --from=builder /app/uxyy-shared/dist ./uxyy-shared/dist
COPY --from=builder /app/uxyy-shared/package.json ./uxyy-shared/
COPY --from=builder /app/uxyy-api/dist ./uxyy-api/dist
COPY --from=builder /app/uxyy-api/package.json ./uxyy-api/

WORKDIR /app/uxyy-api

EXPOSE 3000

CMD ["node", "dist/main.js"]
