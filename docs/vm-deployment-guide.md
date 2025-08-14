# 🖥️ Guía Completa: Despliegue POS Argentina en VirtualBox

## 📋 Especificaciones Recomendadas para la VM

### **Configuración Mínima:**
- **RAM**: 4 GB (recomendado 8 GB)
- **Disco Duro**: 50 GB (dinámico)
- **CPU**: 2 cores (recomendado 4 cores)
- **OS**: Ubuntu 22.04 LTS Desktop/Server
- **Red**: NAT + Port Forwarding

### **Configuración Avanzada:**
- **RAM**: 8 GB 
- **Disco Duro**: 80 GB SSD (si tienes)
- **CPU**: 4 cores con virtualización habilitada
- **Red**: Bridged Adapter (para acceso desde red local)

## 🚀 Paso 1: Configurar VM en VirtualBox

### **1.1 Crear Nueva VM:**
```bash
Nombre: POS-Argentina-VM
Tipo: Linux
Versión: Ubuntu (64-bit)
RAM: 8192 MB (8 GB)
Disco: Crear disco duro virtual ahora (VDI, Dinámico, 80 GB)
```

### **1.2 Configurar VM antes del primer arranque:**
```bash
# En VirtualBox Manager, seleccionar VM → Configuración:

Sistema:
- ✅ Habilitar EFI
- ✅ Habilitar virtualización VT-x/AMD-V
- ✅ Habilitar virtualización anidada

Red:
- Adaptador 1: NAT
- Avanzado → Port Forwarding:
  * HTTP-Terminal: TCP, Host 3000, Guest 3000
  * HTTP-Admin: TCP, Host 3001, Guest 3001  
  * API: TCP, Host 4000, Guest 4000
  * PostgreSQL: TCP, Host 5432, Guest 5432
  * SSH: TCP, Host 2222, Guest 22

Audio: Deshabilitado (opcional)
USB: Deshabilitado (opcional)
```

## 💿 Paso 2: Instalar Ubuntu 22.04 LTS

### **2.1 Descargar ISO:**
- Ir a: https://ubuntu.com/download/desktop
- Descargar: `ubuntu-22.04.3-desktop-amd64.iso`

### **2.2 Instalación:**
```bash
# Montar ISO en VM y arrancar
# Durante instalación:
- Idioma: Español (o inglés)
- Instalación normal
- Borrar disco e instalar Ubuntu
- Usuario: pos-admin
- Contraseña: pos123456 (o la que prefieras)
- ✅ Instalar actualizaciones durante instalación
```

### **2.3 Primeras configuraciones:**
```bash
# Una vez instalado Ubuntu, abrir terminal:
sudo apt update && sudo apt upgrade -y
sudo apt install curl wget git nano htop net-tools -y

# Opcional: Instalar Guest Additions para mejor rendimiento
sudo apt install virtualbox-guest-additions-iso -y
```

## 🐳 Paso 3: Instalar Docker y Docker Compose

### **3.1 Instalar Docker:**
```bash
# Remover versiones antiguas
sudo apt remove docker docker-engine docker.io containerd runc

# Instalar dependencias
sudo apt install ca-certificates curl gnupg lsb-release -y

# Agregar clave GPG oficial de Docker
sudo mkdir -m 0755 -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Agregar repositorio
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker Engine
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin -y

# Agregar usuario al grupo docker
sudo usermod -aG docker $USER
newgrp docker

# Verificar instalación
docker --version
docker compose version
```

### **3.2 Configurar Docker para arranque automático:**
```bash
sudo systemctl enable docker
sudo systemctl start docker

# Verificar que funciona sin sudo
docker run hello-world
```

## 📁 Paso 4: Transferir Código del Proyecto

### **Opción A: Git Clone (Recomendado)**
```bash
# Si tienes el código en GitHub/GitLab:
cd ~
git clone <URL_DEL_REPOSITORIO> pos-argentina
cd pos-argentina
```

### **Opción B: Transferir por SCP/SFTP**
```bash
# Desde tu máquina host (PowerShell/CMD):
# Comprimir proyecto
7z a POS-Ar.zip F:\POS-Ar\*

# Transferir a VM (usando SSH port forwarding)
scp -P 2222 POS-Ar.zip pos-admin@localhost:~/

# En la VM:
cd ~
unzip POS-Ar.zip
mv POS-Ar pos-argentina
cd pos-argentina
```

### **Opción C: Carpeta Compartida VirtualBox**
```bash
# En VirtualBox: VM Settings → Shared Folders
# Agregar: Folder Path: F:\POS-Ar, Folder Name: pos-share, Auto-mount

# En la VM:
sudo mkdir /mnt/pos-share
sudo mount -t vboxsf pos-share /mnt/pos-share
cp -r /mnt/pos-share/* ~/pos-argentina/
```

## 🔧 Paso 5: Preparar el Entorno

### **5.1 Instalar Node.js (para desarrollo híbrido opcional):**
```bash
# Instalar Node Version Manager
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Instalar Node.js LTS
nvm install --lts
nvm use --lts
nvm alias default node

# Verificar
node --version
npm --version
```

### **5.2 Verificar proyecto:**
```bash
cd ~/pos-argentina
ls -la

# Verificar que existen los archivos clave:
ls -la docker-compose.yml
ls -la apps/
ls -la docker/init-db.sql
```

## 🚀 Paso 6: Ejecutar Sistema POS Completo

### **6.1 Construcción inicial:**
```bash
cd ~/pos-argentina

# Construir imágenes Docker
docker compose build

# Verificar que las imágenes se crearon
docker images
```

### **6.2 Iniciar servicios paso a paso:**
```bash
# 1. Iniciar base de datos y Redis
docker compose up -d postgres redis

# Verificar que están funcionando
docker compose ps
docker compose logs postgres

# 2. Esperar a que PostgreSQL esté listo (30-60 segundos)
docker compose logs postgres | grep "ready to accept connections"

# 3. Iniciar API
docker compose up -d pos-api

# Verificar API
docker compose logs pos-api
curl http://localhost:4000/api/v1/health

# 4. Iniciar frontend
docker compose up -d pos-terminal pos-admin

# Verificar todo está funcionando
docker compose ps
```

### **6.3 Verificar puertos:**
```bash
# Verificar que los puertos están escuchando
sudo netstat -tlnp | grep -E ":3000|:3001|:4000|:5432"

# O con ss:
ss -tlnp | grep -E ":3000|:3001|:4000|:5432"
```

## 🧪 Paso 7: Realizar Pruebas Completas

### **7.1 Pruebas desde dentro de la VM:**
```bash
# Probar API
curl http://localhost:4000/api/v1/health
curl http://localhost:4000/api/v1/products

# Abrir navegador en la VM
firefox http://localhost:3000  # Terminal POS
firefox http://localhost:3001  # Admin Panel
```

### **7.2 Pruebas desde tu máquina host:**
```bash
# En tu navegador del host:
http://localhost:3000  # Terminal POS
http://localhost:3001  # Admin Panel
http://localhost:4000/api/v1/health  # API Health Check

# Probar con curl desde host:
curl http://localhost:4000/api/v1/products
```

### **7.3 Pruebas de base de datos:**
```bash
# Conectar a PostgreSQL desde la VM
docker compose exec postgres psql -U pos_user -d pos_argentina

# Consultas de prueba:
\dt pos.*  -- Listar tablas
SELECT * FROM pos.products LIMIT 5;
SELECT * FROM pos.customers LIMIT 5;
\q  -- Salir
```

## 📊 Paso 8: Monitoreo y Logs

### **8.1 Ver logs en tiempo real:**
```bash
# Logs de todos los servicios
docker compose logs -f

# Logs de un servicio específico
docker compose logs -f pos-api
docker compose logs -f pos-terminal
docker compose logs -f postgres
```

### **8.2 Monitorear recursos:**
```bash
# Ver uso de recursos
docker stats

# Ver estado de contenedores
docker compose ps

# Ver puertos ocupados
sudo netstat -tlnp
```

## 🔧 Paso 9: Comandos Útiles

### **9.1 Gestión del sistema:**
```bash
# Parar todo
docker compose down

# Parar y eliminar volúmenes (CUIDADO: borra la BD)
docker compose down -v

# Reiniciar un servicio específico
docker compose restart pos-api

# Ver logs específicos
docker compose logs pos-api --tail=50

# Ejecutar comandos dentro de contenedores
docker compose exec pos-api bash
docker compose exec postgres psql -U pos_user -d pos_argentina
```

### **9.2 Solución de problemas:**
```bash
# Si algo no funciona, reconstruir:
docker compose down
docker compose build --no-cache
docker compose up -d

# Limpiar sistema Docker
docker system prune -a

# Ver información detallada de error
docker compose logs pos-api | tail -100
```

## ✅ Paso 10: Lista de Verificación Final

### **Checklist de funcionamiento:**
- [ ] VM configurada con 8GB RAM y 4 cores
- [ ] Ubuntu 22.04 instalado y actualizado
- [ ] Docker y Docker Compose funcionando
- [ ] Código transferido a ~/pos-argentina
- [ ] Puerto forwarding configurado (3000, 3001, 4000, 5432)
- [ ] `docker compose ps` muestra todos los servicios UP
- [ ] http://localhost:3000 carga el Terminal POS
- [ ] http://localhost:3001 carga el Admin Panel
- [ ] http://localhost:4000/api/v1/health responde OK
- [ ] Base de datos PostgreSQL accesible
- [ ] Logs no muestran errores críticos

### **URLs de prueba:**
```
Terminal POS: http://localhost:3000
Admin Panel:  http://localhost:3001
API Health:   http://localhost:4000/api/v1/health
API Products: http://localhost:4000/api/v1/products
API Customers: http://localhost:4000/api/v1/customers
```

## 🎯 Casos de Prueba Recomendados

1. **Productos**: Crear, editar, buscar productos
2. **Clientes**: Registrar clientes, gestionar "fiado"
3. **Ventas**: Procesar venta completa end-to-end
4. **Reportes**: Ver métricas y estadísticas
5. **Módulos**: Instalar/desinstalar módulos
6. **Rendimiento**: Múltiples usuarios simultáneos

¿Te ayudo con algún paso específico o tienes alguna duda sobre la configuración?