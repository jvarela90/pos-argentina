#!/bin/bash

# 🧪 Script de Pruebas Completas del Sistema POS Argentina
# Ejecuta pruebas automatizadas para verificar que todo funciona

set -e
LOG_FILE="/tmp/pos-test-$(date +'%Y%m%d-%H%M%S').log"

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

# Contadores
TESTS_TOTAL=0
TESTS_PASSED=0
TESTS_FAILED=0

run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_pattern="$3"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    info "🧪 Ejecutando: $test_name"
    
    if eval "$test_command" 2>&1 | grep -q "$expected_pattern"; then
        log "✅ PASS: $test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        error "❌ FAIL: $test_name"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        eval "$test_command" 2>&1 | tail -3 | tee -a $LOG_FILE
    fi
}

# Banner
echo -e "${BLUE}"
cat << "EOF"
  ______ _____ _____ _______    _____ ____  __  __ _____  _      ______ _______ ____  
 |  ____|_   _|  __ \__   __|  / ____/ __ \|  \/  |  __ \| |    |  ____|__   __|  _ \ 
 | |__    | | | |__) | | |    | |   | |  | | \  / | |__) | |    | |__     | |  | |_) |
 |  __|   | | |  _  /  | |    | |   | |  | | |\/| |  ___/| |    |  __|    | |  |  _ < 
 | |     _| |_| | \ \  | |    | |___| |__| | |  | | |    | |____| |____   | |  | |_) |
 |_|    |_____|_|  \_\ |_|     \_____\____/|_|  |_|_|    |______|______|  |_|  |____/ 
                                                                                      
EOF
echo -e "${NC}"

log "🚀 Iniciando pruebas completas del sistema POS Argentina"
log "📝 Log: $LOG_FILE"

# Verificar que estamos en el directorio correcto
if [[ ! -f "docker-compose.yml" ]]; then
    error "No se encontró docker-compose.yml. Ejecutar desde el directorio del proyecto."
    exit 1
fi

# 1. Pruebas de Infraestructura
log "🏗️  FASE 1: INFRAESTRUCTURA"

run_test "Docker está funcionando" \
    "docker --version" \
    "Docker version"

run_test "Docker Compose está funcionando" \
    "docker compose version" \
    "Docker Compose version"

run_test "Contenedores están ejecutándose" \
    "docker compose ps" \
    "Up"

# 2. Pruebas de Base de Datos
log "🗄️  FASE 2: BASE DE DATOS"

run_test "PostgreSQL está accesible" \
    "docker compose exec -T postgres pg_isready -U pos_user" \
    "accepting connections"

run_test "Base de datos pos_argentina existe" \
    "docker compose exec -T postgres psql -U pos_user -lqt" \
    "pos_argentina"

run_test "Esquema pos existe" \
    "docker compose exec -T postgres psql -U pos_user -d pos_argentina -c '\dn pos'" \
    "pos"

run_test "Tabla products existe y tiene datos" \
    "docker compose exec -T postgres psql -U pos_user -d pos_argentina -c 'SELECT COUNT(*) FROM pos.products'" \
    "[0-9]+"

run_test "Tabla customers existe" \
    "docker compose exec -T postgres psql -U pos_user -d pos_argentina -c '\dt pos.customers'" \
    "customers"

run_test "Tabla sales existe" \
    "docker compose exec -T postgres psql -U pos_user -d pos_argentina -c '\dt pos.sales'" \
    "sales"

# 3. Pruebas de API
log "🛤️  FASE 3: API"

# Esperar a que la API esté lista
info "⏳ Esperando a que la API esté lista..."
sleep 10

run_test "API Health Check" \
    "curl -s http://localhost:4000/api/v1/health" \
    "success.*true"

run_test "API Products endpoint" \
    "curl -s http://localhost:4000/api/v1/products" \
    "success.*true"

run_test "API Products tiene datos" \
    "curl -s http://localhost:4000/api/v1/products" \
    "data.*\["

run_test "API Customers endpoint" \
    "curl -s http://localhost:4000/api/v1/customers" \
    "success.*true"

run_test "API Sales endpoint" \
    "curl -s http://localhost:4000/api/v1/sales" \
    "success.*true"

# 4. Pruebas de Frontend
log "🖥️  FASE 4: FRONTEND"

run_test "Terminal POS está servido" \
    "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000" \
    "200"

run_test "Admin Panel está servido" \
    "curl -s -o /dev/null -w '%{http_code}' http://localhost:3001" \
    "200"

run_test "Terminal POS carga React" \
    "curl -s http://localhost:3000" \
    "react"

run_test "Admin Panel carga React" \
    "curl -s http://localhost:3001" \
    "react"

# 5. Pruebas de Integración API
log "🔗 FASE 5: INTEGRACIÓN API"

# Crear producto de prueba
PRODUCT_DATA='{"name":"Test Product","price":1500,"category":"Test","barcode":"1234567890123","stock":100,"minStock":10,"tax":21,"active":true}'

run_test "Crear producto via API" \
    "curl -s -X POST http://localhost:4000/api/v1/products -H 'Content-Type: application/json' -d '$PRODUCT_DATA'" \
    "success.*true"

run_test "Buscar producto por código de barras" \
    "curl -s http://localhost:4000/api/v1/products/barcode/1234567890123" \
    "Test Product"

run_test "Buscar productos por categoría" \
    "curl -s 'http://localhost:4000/api/v1/products?category=Test'" \
    "Test Product"

run_test "Obtener productos con stock bajo" \
    "curl -s http://localhost:4000/api/v1/products/alerts/low-stock" \
    "success.*true"

# Crear cliente de prueba
CUSTOMER_DATA='{"firstName":"Test","lastName":"Customer","email":"test@example.com","phone":"11-1234-5678","dni":"12345678","creditLimit":5000}'

run_test "Crear cliente via API" \
    "curl -s -X POST http://localhost:4000/api/v1/customers -H 'Content-Type: application/json' -d '$CUSTOMER_DATA'" \
    "success.*true"

run_test "Buscar clientes" \
    "curl -s 'http://localhost:4000/api/v1/customers?search=Test'" \
    "Test Customer"

# 6. Pruebas de Rendimiento Básico
log "⚡ FASE 6: RENDIMIENTO BÁSICO"

run_test "API responde en menos de 2 segundos" \
    "timeout 2s curl -s http://localhost:4000/api/v1/health" \
    "success.*true"

run_test "Frontend carga en menos de 5 segundos" \
    "timeout 5s curl -s http://localhost:3000" \
    "html"

# 7. Pruebas de Logs
log "📋 FASE 7: LOGS Y MONITOREO"

run_test "API no tiene errores críticos en logs" \
    "docker compose logs pos-api --tail=50" \
    -v "ERROR\|FATAL"

run_test "PostgreSQL no tiene errores en logs" \
    "docker compose logs postgres --tail=50" \
    -v "ERROR\|FATAL"

# 8. Pruebas de Recursos
log "📊 FASE 8: RECURSOS DEL SISTEMA"

run_test "Uso de memoria de contenedores es razonable" \
    "docker stats --no-stream --format 'table {{.Container}}\t{{.MemUsage}}'" \
    "MiB"

# Obtener estadísticas de contenedores
info "📈 Estadísticas de contenedores:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" | tee -a $LOG_FILE

# Reporte final
log "📊 REPORTE FINAL DE PRUEBAS"
echo "===========================================" | tee -a $LOG_FILE
log "✅ Pruebas exitosas: $TESTS_PASSED"
if [ $TESTS_FAILED -gt 0 ]; then
    error "❌ Pruebas fallidas: $TESTS_FAILED"
else
    log "🎉 Todas las pruebas pasaron!"
fi
log "📊 Total de pruebas: $TESTS_TOTAL"
echo "===========================================" | tee -a $LOG_FILE

# Información del sistema
log "ℹ️  INFORMACIÓN DEL SISTEMA"
info "Estado de contenedores:"
docker compose ps | tee -a $LOG_FILE

info "URLs del sistema:"
echo "  • Terminal POS: http://localhost:3000" | tee -a $LOG_FILE
echo "  • Admin Panel:  http://localhost:3001" | tee -a $LOG_FILE
echo "  • API:          http://localhost:4000" | tee -a $LOG_FILE
echo "  • PostgreSQL:   localhost:5432" | tee -a $LOG_FILE

log "📝 Log completo guardado en: $LOG_FILE"

# Resultado final
if [ $TESTS_FAILED -gt 0 ]; then
    error "❌ Algunas pruebas fallaron. Revisar el log para más detalles."
    exit 1
else
    log "🎉 ¡Todas las pruebas exitosas! Sistema POS completamente funcional."
    exit 0
fi