# 🏪 POS Argentina - Sistema Modular de Punto de Venta

Sistema POS modular diseñado específicamente para el mercado argentino, que permite a comercios de todos los tamaños implementar solo las funcionalidades que necesitan, escalando gradualmente según el crecimiento del negocio.

![Estado del Proyecto](https://img.shields.io/badge/Estado-Beta--Ready-green)
![Versión](https://img.shields.io/badge/Versión-1.0.0--beta-blue)
![Licencia](https://img.shields.io/badge/Licencia-MIT-green)
![Docker](https://img.shields.io/badge/Docker-Ready-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue)
![React](https://img.shields.io/badge/React-18-blue)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)

## 🚀 Características Principales

- **🧩 Modular**: Instala solo los módulos que necesitas
- **🇦🇷 Argentino**: Integración AFIP, "fiado", inflación, medios de pago locales
- **📱 PWA**: Funciona en tablets, celulares y PCs
- **🔄 Offline-First**: Funciona sin internet con sincronización automática
- **💰 Escalable**: Desde kioscos hasta supermercados multi-terminal
- **🎯 Simple**: Filosofía "menos es más" - máximo 3 clicks por operación

## 📦 Módulos Disponibles

### Módulos Base
- **POS-Core** ($12.000/mes) - Terminal de venta básica
- **Inventory-Lite** (+$4.000/mes) - Gestión de productos y stock
- **Customers-Basic** (+$3.000/mes) - Clientes y sistema de "fiado"

### Módulos Avanzados  
- **Fiscal-Simple** (+$6.000/mes) - Facturación electrónica AFIP
- **Payments-Digital** (+$5.000/mes) - MercadoPago, MODO, QR
- **Reports-Basic** (+$2.500/mes) - Reportes y analytics

## 🛠️ Tecnologías

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Base de Datos**: PostgreSQL + SQLite (offline)
- **PWA**: Service Worker + Web App Manifest
- **Testing**: Jest + React Testing Library + Cypress
- **DevOps**: Docker + Docker Compose

## ⚡ Inicio Rápido

### Prerrequisitos
- Node.js 18+
- Docker y Docker Compose
- Git

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/TU_USUARIO/pos-argentina.git
cd pos-argentina

# Instalar dependencias
npm install

# Configurar base de datos de desarrollo
npm run setup:db

# Iniciar en modo desarrollo
npm run dev
```

Esto iniciará:
- 🌐 Terminal PWA en http://localhost:3000
- 🔧 Panel Admin en http://localhost:3001  
- 🚀 API Backend en http://localhost:4000
- 🗄️ PostgreSQL en puerto 5432

### 🐳 Docker (Recomendado)

```bash
# Iniciar servicios base (BD y Redis)
docker compose up -d postgres redis

# Iniciar API
docker compose up -d pos-api

# Iniciar frontend
docker compose up -d pos-terminal pos-admin

# Ver estado de todos los servicios
docker compose ps

# Ver logs en tiempo real
docker compose logs -f

# Parar servicios
docker compose down
```

### 🖥️ Despliegue en VM (Para Testing)

Para testing completo recomendamos usar VirtualBox con Ubuntu:

```bash
# 1. Crear VM con Ubuntu 22.04 (8GB RAM, 80GB disco)
# 2. Ejecutar script de setup automático
wget https://raw.githubusercontent.com/TU_USUARIO/pos-argentina/main/scripts/vm-setup.sh
chmod +x vm-setup.sh && ./vm-setup.sh

# 3. Transferir código y ejecutar
cd ~/pos-argentina
./start-pos.sh

# 4. Ejecutar pruebas completas
./test-complete-system.sh
```

Ver guía completa: [docs/vm-deployment-guide.md](docs/vm-deployment-guide.md)

## 🏗️ Estructura del Proyecto

```
pos-system/
├── apps/
│   ├── pos-terminal/     # PWA Terminal de ventas
│   ├── pos-admin/        # Panel de administración
│   └── pos-api/          # Backend API REST
├── packages/
│   ├── shared/           # Componentes compartidos
│   ├── pos-core/         # Módulo base de ventas
│   ├── inventory/        # Módulo inventario
│   ├── customers/        # Módulo clientes
│   ├── fiscal/           # Módulo AFIP
│   ├── payments/         # Módulo pagos
│   └── reports/          # Módulo reportes
├── tools/
│   ├── build-tools/      # Scripts de build
│   └── eslint-config/    # Configuración ESLint
├── docs/                 # Documentación técnica
└── docker/              # Configuraciones Docker
```

## 🎯 Combos Predefinidos

### 🏪 Combo Kiosco - $18.000/mes
- POS-Core + Inventory-Lite
- Perfecto para ventas rápidas
- Hasta 500 productos

### 🏬 Combo Almacén - $21.000/mes  
- Combo Kiosco + Customers-Basic + Reports-Basic
- Incluye sistema de "fiado"
- Ideal para comercios de barrio

### 💼 Combo Profesional - $32.000/mes
- Todos los módulos
- Facturación electrónica AFIP
- Pagos digitales completos

## 📖 Guías de Desarrollo

### Crear un Nuevo Módulo

```bash
# Generar estructura de módulo
npm run create:module my-new-module

# Esto crea:
packages/my-new-module/
├── src/
│   ├── index.ts          # Exportaciones principales
│   ├── module.ts         # Clase principal del módulo
│   ├── components/       # Componentes React
│   ├── services/         # Lógica de negocio
│   └── types/           # Definiciones TypeScript
├── tests/               # Tests unitarios
├── package.json
└── README.md
```

### Estándares de Código

```typescript
// ✅ BIEN - Función simple y clara
export const calculateTotal = (items: SaleItem[]): number => {
  return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
};

// ✅ BIEN - Módulo con una responsabilidad
export class InventoryModule extends BaseModule {
  constructor() {
    super({
      id: 'inventory',
      version: '1.0.0',
      dependencies: ['pos-core']
    });
  }
}
```

### Reglas Obligatorias
- ✅ Máximo 200 líneas por archivo
- ✅ Máximo 4 parámetros por función  
- ✅ 85% cobertura de tests
- ✅ 0 errores TypeScript
- ✅ 0 warnings ESLint

## 🧪 Testing

```bash
# Tests unitarios
npm run test

# Tests integración
npm run test:integration

# Tests E2E
npm run test:e2e

# Coverage report
npm run test:coverage
```

## 📱 Demo y Pruebas

### Demo Online
- **Terminal**: https://demo.pos-argentina.com
- **Admin**: https://admin.pos-argentina.com
- **Usuario**: demo / demo123

### Datos de Prueba
El sistema incluye datos de prueba para Argentina:
- Productos típicos (pan, leche, gaseosas)
- Clientes con cuentas corrientes
- Transacciones de ejemplo
- Configuración para almacén de barrio

## 🚀 Despliegue

### Desarrollo
```bash
npm run build
npm run start
```

### Producción
```bash
# Build optimizado
npm run build:prod

# Deploy con Docker
docker build -t pos-argentina .
docker run -p 3000:3000 pos-argentina
```

## 🤝 Contribuir

1. Fork del proyecto
2. Crear branch feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'Agrega nueva funcionalidad'`)
4. Push al branch (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

### Proceso de Desarrollo
- **Sprint Planning**: Lunes 9:00 AM
- **Daily Standup**: 9:30 AM (15 min máximo)
- **Code Review**: Obligatorio, máximo 24h para review
- **Deploy**: Automático a staging en cada merge a `develop`

## 📞 Soporte

- **Documentación**: https://docs.pos-argentina.com
- **Issues**: https://github.com/pos-argentina/pos-system/issues
- **Soporte Técnico**: soporte@pos-argentina.com
- **Ventas**: ventas@pos-argentina.com

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.

## 🏢 Acerca del Proyecto

POS Argentina es desarrollado por un equipo de ingenieros argentinos que entienden las necesidades específicas del mercado local: desde la integración con AFIP hasta el sistema de "fiado" tan importante en almacenes de barrio.

**Misión**: Democratizar la tecnología POS para comercios argentinos de todos los tamaños.

---

**¿Necesitas ayuda?** Abre un [issue](https://github.com/pos-argentina/pos-system/issues) o contactanos en soporte@pos-argentina.com