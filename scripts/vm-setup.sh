#!/bin/bash

# 🚀 Script de Setup Automático para VM Ubuntu
# Ejecutar después de instalar Ubuntu en VirtualBox

set -e  # Salir si hay error
LOG_FILE="/home/$USER/pos-setup.log"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para logging
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a $LOG_FILE
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
    ____       _               ____            _       _   
   / ___|  ___| |_ _   _ _ __  / ___|  ___ _ __(_)_ __ | |_ 
   \___ \ / _ \ __| | | | '_ \ \___ \ / __| '__| | '_ \| __|
    ___) |  __/ |_| |_| | |_) | ___) | (__| |  | | |_) | |_ 
   |____/ \___|\__|\__,_| .__/ |____/ \___|_|  |_| .__/ \__|
                        |_|                      |_|        
EOF
echo -e "${NC}"

log "🚀 Iniciando setup automático de POS Argentina en VM Ubuntu"
log "📝 Log guardado en: $LOG_FILE"

# Verificar que estamos en Ubuntu
if ! command -v apt &> /dev/null; then
    error "Este script es solo para sistemas basados en Debian/Ubuntu"
    exit 1
fi

# Actualizar sistema
log "📦 Actualizando sistema Ubuntu..."
sudo apt update && sudo apt upgrade -y

# Instalar herramientas básicas
log "🔧 Instalando herramientas básicas..."
sudo apt install -y \
    curl \
    wget \
    git \
    nano \
    vim \
    htop \
    net-tools \
    unzip \
    ca-certificates \
    gnupg \
    lsb-release \
    software-properties-common

# Instalar Docker
log "🐳 Instalando Docker..."

# Remover versiones antiguas
sudo apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# Agregar repositorio oficial de Docker
sudo mkdir -m 0755 -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker Engine
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Configurar Docker para el usuario actual
sudo usermod -aG docker $USER

# Habilitar Docker para arranque automático
sudo systemctl enable docker
sudo systemctl start docker

log "✅ Docker instalado correctamente"

# Instalar Node.js (opcional para desarrollo)
log "📦 Instalando Node.js LTS..."
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Cargar NVM en la sesión actual
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

# Instalar Node.js LTS
nvm install --lts
nvm use --lts
nvm alias default node

log "✅ Node.js instalado: $(node --version)"

# Crear directorio para el proyecto
log "📁 Preparando directorio del proyecto..."
cd ~
mkdir -p pos-argentina
cd pos-argentina

# Configurar Git (opcional)
log "🔧 Configurando Git..."
read -p "¿Configurar Git? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Nombre de usuario Git: " git_name
    read -p "Email Git: " git_email
    git config --global user.name "$git_name"
    git config --global user.email "$git_email"
    log "✅ Git configurado para $git_name <$git_email>"
fi

# Crear archivo de variables de entorno
log "⚙️  Creando archivo de configuración..."
cat > ~/.pos-env << 'EOF'
# Variables de entorno para POS Argentina
export DATABASE_URL="postgresql://pos_user:pos_password123@localhost:5432/pos_argentina"
export REDIS_URL="redis://localhost:6379"
export JWT_SECRET="dev-secret-key-change-in-production"
export NODE_ENV="development"
export PORT="4000"
export VITE_API_URL="http://localhost:4000"
EOF

# Agregar al bashrc
echo "source ~/.pos-env" >> ~/.bashrc

log "✅ Variables de entorno configuradas"

# Crear scripts útiles
log "📝 Creando scripts de utilidad..."

# Script para iniciar el sistema
cat > ~/start-pos.sh << 'EOF'
#!/bin/bash
cd ~/pos-argentina
echo "🚀 Iniciando sistema POS Argentina..."
docker compose up -d postgres redis
echo "⏳ Esperando a que PostgreSQL esté listo..."
sleep 10
docker compose up -d pos-api
echo "⏳ Esperando a que la API esté lista..."
sleep 5
docker compose up -d pos-terminal pos-admin
echo "✅ Sistema iniciado!"
echo ""
echo "🌐 URLs disponibles:"
echo "  Terminal POS: http://localhost:3000"
echo "  Admin Panel:  http://localhost:3001" 
echo "  API:          http://localhost:4000"
echo ""
echo "📊 Ver estado: docker compose ps"
echo "📋 Ver logs:   docker compose logs -f"
EOF

chmod +x ~/start-pos.sh

# Script para parar el sistema
cat > ~/stop-pos.sh << 'EOF'
#!/bin/bash
cd ~/pos-argentina
echo "🛑 Parando sistema POS Argentina..."
docker compose down
echo "✅ Sistema parado"
EOF

chmod +x ~/stop-pos.sh

# Script para reiniciar el sistema
cat > ~/restart-pos.sh << 'EOF'
#!/bin/bash
cd ~/pos-argentina
echo "🔄 Reiniciando sistema POS Argentina..."
docker compose down
docker compose up -d postgres redis
sleep 10
docker compose up -d pos-api
sleep 5
docker compose up -d pos-terminal pos-admin
echo "✅ Sistema reiniciado!"
EOF

chmod +x ~/restart-pos.sh

# Script para ver logs
cat > ~/logs-pos.sh << 'EOF'
#!/bin/bash
cd ~/pos-argentina
echo "📋 Logs del sistema POS Argentina:"
docker compose logs -f
EOF

chmod +x ~/logs-pos.sh

log "✅ Scripts creados:"
log "   ~/start-pos.sh   - Iniciar sistema"
log "   ~/stop-pos.sh    - Parar sistema" 
log "   ~/restart-pos.sh - Reiniciar sistema"
log "   ~/logs-pos.sh    - Ver logs"

# Verificar instalaciones
log "🔍 Verificando instalaciones..."

echo ""
info "Docker version:"
docker --version

info "Docker Compose version:"  
docker compose version

info "Node.js version:"
node --version

info "npm version:"
npm --version

# Mensaje final
log "🎉 Setup completado exitosamente!"
echo ""
warn "⚠️  IMPORTANTE: Reinicia la sesión o ejecuta 'newgrp docker' para usar Docker sin sudo"
echo ""
info "📋 Próximos pasos:"
info "1. Transferir código del proyecto a ~/pos-argentina/"
info "2. Ejecutar: cd ~/pos-argentina && ~/start-pos.sh"
info "3. Abrir http://localhost:3000 en el navegador"
echo ""
info "📖 Ver guía completa en: ~/pos-argentina/docs/vm-deployment-guide.md"
echo ""
log "📝 Log completo guardado en: $LOG_FILE"

# Sugerir reinicio
echo ""
read -p "¿Reiniciar el sistema ahora para aplicar cambios? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log "🔄 Reiniciando sistema..."
    sudo reboot
fi

log "✅ Setup finalizado. ¡Listo para usar POS Argentina!"