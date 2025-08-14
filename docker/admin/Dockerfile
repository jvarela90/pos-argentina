# Dockerfile para POS Admin Panel
FROM node:18-alpine AS base
WORKDIR /app

# Etapa de construcción
FROM base AS deps
COPY package*.json ./
COPY apps/pos-admin/package*.json ./apps/pos-admin/
COPY packages/shared/package*.json ./packages/shared/
RUN npm ci --only=production=false

# Construir la aplicación
FROM deps AS builder
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_APP_NAME="POS Argentina - Admin"
ENV VITE_APP_VERSION="1.0.0"

COPY apps/pos-admin ./apps/pos-admin
COPY packages/shared ./packages/shared
COPY tsconfig.base.json ./

RUN cd apps/pos-admin && npm run build

# Etapa de producción con Nginx
FROM nginx:alpine AS runner

# Instalar curl para health check
RUN apk add --no-cache curl

# Copiar archivos construidos
COPY --from=builder /app/apps/pos-admin/dist /usr/share/nginx/html

# Configuración de Nginx para SPA
COPY docker/admin/nginx.conf /etc/nginx/conf.d/default.conf

# Script para configuración dinámica
COPY docker/admin/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Crear usuario no-root
RUN addgroup --system --gid 1001 nginx-group
RUN adduser --system --uid 1001 nginx-user

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3001/ || exit 1

ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]