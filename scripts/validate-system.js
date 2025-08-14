#!/usr/bin/env node

/**
 * Script de validación del sistema POS Argentina
 * Verifica que todas las conexiones y configuraciones estén correctas
 */

import fs from 'fs';
import path from 'path';

const COLORS = {
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m'
};

function log(color, message) {
  console.log(`${color}${message}${COLORS.RESET}`);
}

function success(message) {
  log(COLORS.GREEN, `✅ ${message}`);
}

function error(message) {
  log(COLORS.RED, `❌ ${message}`);
}

function warning(message) {
  log(COLORS.YELLOW, `⚠️  ${message}`);
}

function info(message) {
  log(COLORS.BLUE, `ℹ️  ${message}`);
}

function header(message) {
  console.log(`\n${COLORS.BOLD}${COLORS.BLUE}${message}${COLORS.RESET}`);
  console.log('='.repeat(message.length));
}

async function validateSystem() {
  header('🚀 VALIDACIÓN COMPLETA DEL SISTEMA POS ARGENTINA');
  
  let issues = [];
  let recommendations = [];

  // 1. Validar estructura de archivos
  header('📁 Validando Estructura de Archivos');
  
  const requiredFiles = [
    'apps/pos-api/src/db.ts',
    'apps/pos-api/src/routes/products.ts',
    'apps/pos-api/src/routes/customers.ts',
    'apps/pos-api/src/routes/sales.ts',
    'apps/pos-terminal/src/contexts/POSContext.tsx',
    'docker-compose.yml',
    'docker/init-db.sql'
  ];

  for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
      success(`Archivo encontrado: ${file}`);
    } else {
      error(`Archivo faltante: ${file}`);
      issues.push(`Falta archivo crítico: ${file}`);
    }
  }

  // 2. Validar configuración de base de datos
  header('🗄️  Validando Configuración de Base de Datos');
  
  try {
    const dbFile = fs.readFileSync('apps/pos-api/src/db.ts', 'utf8');
    
    if (dbFile.includes('postgresql://') || dbFile.includes('process.env.DATABASE_URL')) {
      success('Configuración de PostgreSQL detectada');
    } else {
      error('Configuración de PostgreSQL no encontrada');
      issues.push('Configuración de PostgreSQL incompleta');
    }

    if (dbFile.includes('pool.query')) {
      success('Cliente de base de datos configurado correctamente');
    } else {
      warning('Cliente de base de datos podría estar incompleto');
    }

    if (dbFile.includes('handleDatabaseError')) {
      success('Manejo de errores de base de datos implementado');
    } else {
      recommendations.push('Implementar manejo robusto de errores de DB');
    }

  } catch (err) {
    error('No se pudo leer el archivo de configuración de DB');
    issues.push('Archivo db.ts no accesible');
  }

  // 3. Validar rutas de API
  header('🛤️  Validando Rutas de API');
  
  const apiRoutes = ['products.ts', 'customers.ts', 'sales.ts'];
  
  for (const route of apiRoutes) {
    try {
      const routeFile = fs.readFileSync(`apps/pos-api/src/routes/${route}`, 'utf8');
      
      if (routeFile.includes('query(') && !routeFile.includes('let products = [')) {
        success(`Ruta ${route}: Conectada a base de datos ✓`);
      } else if (routeFile.includes('let products = [')) {
        error(`Ruta ${route}: Usando datos hardcodeados ✗`);
        issues.push(`${route} necesita conectarse a la base de datos`);
      } else {
        warning(`Ruta ${route}: Estado incierto`);
      }

      if (routeFile.includes('z.object(')) {
        success(`Ruta ${route}: Validación con Zod implementada ✓`);
      } else {
        recommendations.push(`Implementar validación Zod en ${route}`);
      }

    } catch (err) {
      error(`No se pudo validar ruta: ${route}`);
      issues.push(`Archivo de ruta ${route} no accesible`);
    }
  }

  // 4. Validar frontend
  header('🖥️  Validando Frontend');
  
  try {
    const posContextFile = fs.readFileSync('apps/pos-terminal/src/contexts/POSContext.tsx', 'utf8');
    
    if (posContextFile.includes('fetch(') && posContextFile.includes('VITE_API_URL')) {
      success('Frontend configurado para consumir API real');
    } else if (posContextFile.includes('demoProducts')) {
      error('Frontend usando datos de demostración');
      issues.push('Frontend necesita conectarse a la API real');
    } else {
      warning('Estado del frontend incierto');
    }

    if (posContextFile.includes('loadInitialData')) {
      success('Función de carga de datos implementada');
    } else {
      recommendations.push('Implementar carga de datos desde API');
    }

  } catch (err) {
    error('No se pudo validar POSContext');
    issues.push('Archivo POSContext.tsx no accesible');
  }

  // 5. Validar Docker
  header('🐳 Validando Configuración Docker');
  
  try {
    const dockerCompose = fs.readFileSync('docker-compose.yml', 'utf8');
    
    if (dockerCompose.includes('postgres:15')) {
      success('PostgreSQL 15 configurado en Docker');
    }

    if (dockerCompose.includes('DATABASE_URL: postgresql://')) {
      success('Variable de entorno DATABASE_URL configurada');
    }

    if (dockerCompose.includes('VITE_API_URL: http://localhost:4000')) {
      success('URL de API configurada para frontend');
    }

    if (dockerCompose.includes('init-db.sql')) {
      success('Script de inicialización de BD configurado');
    }

  } catch (err) {
    error('No se pudo validar docker-compose.yml');
    issues.push('Archivo docker-compose.yml no accesible');
  }

  // 6. Validar SQL de inicialización
  header('📊 Validando Esquema de Base de Datos');
  
  try {
    const initSql = fs.readFileSync('docker/init-db.sql', 'utf8');
    
    const requiredTables = ['pos.products', 'pos.customers', 'pos.sales', 'pos.users'];
    
    for (const table of requiredTables) {
      if (initSql.includes(table)) {
        success(`Tabla ${table} definida en esquema`);
      } else {
        warning(`Tabla ${table} podría estar faltando`);
      }
    }

    if (initSql.includes('uuid_generate_v4()')) {
      success('UUIDs configurados como claves primarias');
    }

    if (initSql.includes('CREATE SCHEMA IF NOT EXISTS pos')) {
      success('Esquema pos configurado correctamente');
    }

  } catch (err) {
    warning('No se pudo validar init-db.sql');
  }

  // 7. Reporte final
  header('📋 REPORTE FINAL');
  
  if (issues.length === 0) {
    success('🎉 ¡SISTEMA COMPLETAMENTE VALIDADO!');
    info('El sistema está correctamente configurado y listo para usar.');
  } else {
    error(`❌ Se encontraron ${issues.length} problemas críticos:`);
    issues.forEach(issue => console.log(`   • ${issue}`));
  }

  if (recommendations.length > 0) {
    warning(`💡 ${recommendations.length} recomendaciones de mejora:`);
    recommendations.forEach(rec => console.log(`   • ${rec}`));
  }

  // 8. Instrucciones de despliegue
  header('🚀 INSTRUCCIONES DE DESPLIEGUE');
  
  info('Para iniciar el sistema completo:');
  console.log('   1. docker compose up -d postgres redis');
  console.log('   2. docker compose up pos-api');
  console.log('   3. docker compose up pos-terminal pos-admin');
  console.log('');
  info('URLs del sistema:');
  console.log('   • Terminal POS: http://localhost:3000');
  console.log('   • Admin Panel: http://localhost:3001');
  console.log('   • API: http://localhost:4000');
  console.log('   • Base de datos: localhost:5432');

  return issues.length === 0;
}

// Ejecutar validación
validateSystem().then(success => {
  process.exit(success ? 0 : 1);
}).catch(err => {
  error('Error durante la validación:', err);
  process.exit(1);
});