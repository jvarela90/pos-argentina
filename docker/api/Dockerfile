# Dockerfile para POS API Backend
FROM node:18-alpine AS base
WORKDIR /app

# Instalar dependencias del sistema
RUN apk add --no-cache dumb-init

# Etapa de construcción
FROM base AS deps
COPY package.json yarn.lock ./
COPY packages ./packages
COPY apps/pos-api ./apps/pos-api
RUN yarn install --frozen-lockfile --production=false

# Construir la aplicación
FROM deps AS builder
RUN yarn workspace @pos-argentina/api build

# Etapa de producción
FROM base AS runner
ENV NODE_ENV production
ENV PORT 4000

# Crear usuario no-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 apiuser

# Copiar archivos necesarios
COPY --from=builder --chown=apiuser:nodejs /app/apps/pos-api/dist ./
COPY --from=builder --chown=apiuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=apiuser:nodejs /app/package.json ./package.json

# Crear directorio para certificados AFIP
RUN mkdir -p /app/certs && chown apiuser:nodejs /app/certs

USER apiuser

EXPOSE 4000

# Usar dumb-init para manejo correcto de señales
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/api/v1/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"