#!/bin/bash

# Script de despliegue para POS Argentina
# Automatiza el proceso de despliegue en producción

set -e  # Salir si cualquier comando falla

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función de logging con colores
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Verificar que estamos en el directorio correcto
if [ ! -f "docker-compose.prod.yml" ]; then
    error "docker-compose.prod.yml no encontrado. Ejecuta este script desde la raíz del proyecto."
    exit 1
fi

# Verificar que el archivo .env existe
if [ ! -f ".env" ]; then
    error "Archivo .env no encontrado. Copia .env.example y configura las variables."
    exit 1
fi

log "Iniciando despliegue de POS Argentina..."

# Cargar variables de entorno
source .env

# Verificar variables críticas
if [ -z "$DOMAIN" ] || [ -z "$POSTGRES_PASSWORD" ] || [ -z "$JWT_SECRET" ]; then
    error "Variables de entorno críticas no configuradas. Revisa tu archivo .env"
    exit 1
fi

# Verificar que Docker y Docker Compose están instalados
if ! command -v docker >/dev/null 2>&1; then
    error "Docker no está instalado"
    exit 1
fi

if ! command -v docker-compose >/dev/null 2>&1; then
    error "Docker Compose no está instalado"
    exit 1
fi

# Crear directorios necesarios
log "Creando directorios necesarios..."
mkdir -p docker/nginx/ssl
mkdir -p data/postgres
mkdir -p data/redis
mkdir -p data/backups
mkdir -p logs

# Hacer ejecutables los scripts
chmod +x scripts/backup.sh
chmod +x docker/terminal/entrypoint.sh
chmod +x docker/admin/entrypoint.sh

# Parar servicios existentes si están corriendo
if docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    log "Parando servicios existentes..."
    docker-compose -f docker-compose.prod.yml down
fi

# Construir imágenes
log "Construyendo imágenes Docker..."
docker-compose -f docker-compose.prod.yml build --no-cache

# Inicializar certificados SSL si es la primera vez
if [ ! -f "docker/nginx/ssl/live/$DOMAIN/fullchain.pem" ]; then
    log "Configurando certificados SSL inicial..."
    
    # Crear certificados temporales para que nginx pueda iniciar
    mkdir -p "docker/nginx/ssl/live/$DOMAIN"
    
    # Generar certificados auto-firmados temporales
    openssl req -x509 -nodes -days 1 -newkey rsa:2048 \
        -keyout "docker/nginx/ssl/live/$DOMAIN/privkey.pem" \
        -out "docker/nginx/ssl/live/$DOMAIN/fullchain.pem" \
        -subj "/C=AR/ST=Buenos Aires/L=Buenos Aires/O=POS Argentina/CN=$DOMAIN"
    
    info "Certificados temporales creados. Se renovarán automáticamente con Let's Encrypt."
fi

# Iniciar servicios
log "Iniciando servicios..."
docker-compose -f docker-compose.prod.yml up -d

# Esperar a que los servicios estén listos
log "Esperando a que los servicios estén listos..."
sleep 30

# Verificar salud de los servicios
check_service() {
    local service=$1
    local retries=5
    local count=0
    
    while [ $count -lt $retries ]; do
        if docker-compose -f docker-compose.prod.yml ps $service | grep -q "Up (healthy)"; then
            log "✓ $service está funcionando correctamente"
            return 0
        fi
        
        warn "Esperando a que $service esté listo... (intento $((count+1))/$retries)"
        sleep 10
        count=$((count+1))
    done
    
    error "✗ $service no está respondiendo correctamente"
    return 1
}

# Verificar servicios críticos
log "Verificando salud de los servicios..."
check_service postgres
check_service redis
check_service api

# Obtener certificados SSL reales si es posible
if [ "$DOMAIN" != "tu-dominio.com" ] && [ "$EMAIL" != "admin@tu-dominio.com" ]; then
    log "Obteniendo certificados SSL de Let's Encrypt..."
    
    docker-compose -f docker-compose.prod.yml run --rm certbot
    
    # Recargar nginx con los nuevos certificados
    docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload
    
    log "Certificados SSL configurados"
else
    warn "Dominio y email no configurados. Usando certificados auto-firmados."
fi

# Configurar backup inicial
log "Configurando backup inicial..."
docker-compose -f docker-compose.prod.yml exec backup /backup.sh

# Mostrar estado final
log "Mostrando estado de los servicios..."
docker-compose -f docker-compose.prod.yml ps

# Mostrar URLs de acceso
log "¡Despliegue completado exitosamente!"
info "URLs de acceso:"
info "  • Terminal PWA: https://$DOMAIN"
info "  • Panel Admin: https://admin.$DOMAIN"
info "  • API: https://api.$DOMAIN"

# Mostrar logs si hay algún problema
if docker-compose -f docker-compose.prod.yml ps | grep -q "Exit\|unhealthy"; then
    warn "Algunos servicios pueden tener problemas. Verificando logs..."
    docker-compose -f docker-compose.prod.yml logs --tail=20
fi

log "Despliegue finalizado. Monitorea los logs con: docker-compose -f docker-compose.prod.yml logs -f"