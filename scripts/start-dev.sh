#!/bin/bash

# 🚀 Script para iniciar POS Argentina en modo desarrollo
# Versión simplificada que no requiere builds complejos

set -e
LOG_FILE="/tmp/pos-dev-$(date +'%Y%m%d-%H%M%S').log"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}" | tee -a $LOG_FILE
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" | tee -a $LOG_FILE
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}" | tee -a $LOG_FILE
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}" | tee -a $LOG_FILE
}

# Banner
echo -e "${BLUE}"
cat << "EOF"
  ____   ___  ____       _                         _   _             
 |  _ \ / _ \/ ___|     / \   _ __ __ _  ___ _ __ | |_(_)_ __   __ _ 
 | |_) | | | \___ \    / _ \ | '__/ _` |/ _ \ '_ \| __| | '_ \ / _` |
 |  __/| |_| |___) |  / ___ \| | | (_| |  __/ | | | |_| | | | | (_| |
 |_|    \___/|____/  /_/   \_\_|  \__, |\___|_| |_|\__|_|_| |_|\__,_|
                                  |___/                              
    ____             __  __           _      
   |  _ \  _____   _|  \/  | ___   __| | ___ 
   | | | |/ _ \ \ / / |\/| |/ _ \ / _` |/ _ \
   | |_| |  __/\ V /| |  | | (_) | (_| |  __/
   |____/ \___| \_/ |_|  |_|\___/ \__,_|\___|
                                             
EOF
echo -e "${NC}"

log "🚀 Iniciando POS Argentina en modo desarrollo"
log "📝 Log guardado en: $LOG_FILE"

# Verificar que estamos en el directorio correcto
if [[ ! -f "docker-compose.dev.yml" ]]; then
    error "No se encontró docker-compose.dev.yml. Ejecutar desde el directorio del proyecto."
    exit 1
fi

# Obtener IP local
LOCAL_IP=$(hostname -I | awk '{print $1}' 2>/dev/null || echo "localhost")
info "🌐 IP local detectada: $LOCAL_IP"

# Parar servicios previos si existen
log "🛑 Parando servicios previos..."
docker compose -f docker-compose.dev.yml down --remove-orphans 2>/dev/null || true

# Limpiar contenedores huérfanos
log "🧹 Limpiando contenedores huérfanos..."
docker system prune -f --volumes 2>/dev/null || true

# Iniciar servicios base
log "🗄️  Iniciando PostgreSQL y Redis..."
docker compose -f docker-compose.dev.yml up -d postgres redis

# Esperar a que PostgreSQL esté listo
log "⏳ Esperando a que PostgreSQL esté listo..."
for i in {1..30}; do
    if docker compose -f docker-compose.dev.yml exec -T postgres pg_isready -U pos_user &>/dev/null; then
        log "✅ PostgreSQL está listo"
        break
    fi
    if [ $i -eq 30 ]; then
        error "❌ PostgreSQL no pudo iniciarse en 30 segundos"
        exit 1
    fi
    sleep 1
done

# Iniciar API
log "🚀 Iniciando API..."
docker compose -f docker-compose.dev.yml up -d pos-api

# Esperar a que la API esté lista
log "⏳ Esperando a que la API esté lista..."
for i in {1..20}; do
    if curl -s http://localhost:4000/api/v1/health &>/dev/null; then
        log "✅ API está lista"
        break
    fi
    if [ $i -eq 20 ]; then
        warn "⚠️  API tardó más de lo esperado, continuando..."
        break
    fi
    sleep 1
done

# Iniciar frontend
log "🖥️  Iniciando aplicaciones frontend..."
docker compose -f docker-compose.dev.yml up -d pos-terminal pos-admin

# Esperar un poco para que los frontends se inicien
log "⏳ Esperando a que los frontends estén listos..."
sleep 10

# Verificar servicios
log "🔍 Verificando servicios..."
docker compose -f docker-compose.dev.yml ps

# Mostrar información final
log "✅ Sistema iniciado exitosamente!"
echo ""
info "🌐 URLs disponibles:"
echo "   • Terminal POS: http://localhost:3000"
echo "   • Admin Panel:  http://localhost:3001" 
echo "   • API:          http://localhost:4000"
echo ""
info "🌍 URLs de red local:"
echo "   • Terminal POS: http://$LOCAL_IP:3000"
echo "   • Admin Panel:  http://$LOCAL_IP:3001"
echo "   • API:          http://$LOCAL_IP:4000"
echo ""
info "📊 Comandos útiles:"
echo "   • Ver logs:     docker compose -f docker-compose.dev.yml logs -f"
echo "   • Ver estado:   docker compose -f docker-compose.dev.yml ps"
echo "   • Parar todo:   docker compose -f docker-compose.dev.yml down"
echo ""
log "📝 Log completo en: $LOG_FILE"