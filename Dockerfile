# syntax=docker/dockerfile:1

# ---------- 构建阶段 ----------
# 多架构构建时构建阶段只需在构建机上跑一次
FROM --platform=$BUILDPLATFORM node:22-alpine AS build

WORKDIR /app

# 先复制依赖清单，充分利用 Docker 层缓存
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# 复制源码并构建静态文件
COPY . .
RUN npm run build

# ---------- 运行阶段 ----------
FROM nginx:1.27-alpine AS runtime

LABEL org.opencontainers.image.title="txt-to-epub" \
      org.opencontainers.image.description="纯前端 TXT 转 EPUB 工具" \
      org.opencontainers.image.source="https://github.com/xmskf/txt-to-epub" \
      org.opencontainers.image.licenses="MIT"

# SPA 回退、静态资源缓存、gzip
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# 最终镜像只保留构建产物
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
