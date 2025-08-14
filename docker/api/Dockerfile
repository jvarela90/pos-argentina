# Dockerfile para POS API Backend
FROM node:18-alpine AS base
WORKDIR /app

# Instalar dependencias del sistema
RUN apk add --no-cache dumb-init

# Etapa de construcción
FROM base AS deps
COPY package*.json ./
COPY apps/pos-api/package*.json ./apps/pos-api/
COPY packages/shared/package*.json ./packages/shared/
RUN npm install

# Construir la aplicación
FROM deps AS builder
COPY apps/pos-api ./apps/pos-api
COPY packages/shared ./packages/shared
COPY tsconfig.base.json ./

RUN cd apps/pos-api && npm run build

# Etapa de producción
FROM base AS runner
ENV NODE_ENV production
ENV PORT 4000

# Crear usuario no-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 apiuser

# Instalar solo dependencias de producción
COPY package*.json ./
COPY apps/pos-api/package*.json ./apps/pos-api/
RUN npm install --omit=dev && npm cache clean --force

# Copiar archivos construidos
COPY --from=builder --chown=apiuser:nodejs /app/apps/pos-api/dist ./dist
COPY --from=builder --chown=apiuser:nodejs /app/apps/pos-api/package.json ./package.json

# Crear directorio para certificados AFIP
RUN mkdir -p /app/certs && chown apiuser:nodejs /app/certs

USER apiuser

EXPOSE 4000

# Usar dumb-init para manejo correcto de señales
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/api/v1/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"