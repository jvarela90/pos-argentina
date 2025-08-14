#!/usr/bin/env node
/**
 * Script para configurar la base de datos inicial
 * Uso: npm run setup:db
 */

const fs = require('fs');
const path = require('path');

console.log('🛠️ Configurando base de datos POS Argentina...');

// Verificar que Docker esté ejecutándose
const { exec } = require('child_process');

function checkDockerRunning() {
  return new Promise((resolve, reject) => {
    exec('docker info', (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Docker no está ejecutándose o no está instalado');
        console.log('Por favor instala Docker Desktop y asegúrate de que esté ejecutándose');
        reject(error);
      } else {
        console.log('✅ Docker está ejecutándose');
        resolve();
      }
    });
  });
}

function setupDatabase() {
  return new Promise((resolve, reject) => {
    console.log('🐘 Iniciando contenedor PostgreSQL...');
    
    exec('docker-compose up -d postgres redis', (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Error iniciando base de datos:', error);
        reject(error);
      } else {
        console.log('✅ Base de datos iniciada');
        console.log('📊 Datos de conexión:');
        console.log('  Host: localhost');
        console.log('  Puerto: 5432');
        console.log('  Base: pos_argentina');
        console.log('  Usuario: pos_user');
        console.log('  Contraseña: pos_password123');
        console.log('');
        console.log('🔑 Redis:');
        console.log('  Host: localhost');
        console.log('  Puerto: 6379');
        console.log('');
        console.log('⏱️ Esperando 10 segundos para que la base se inicialice...');
        
        setTimeout(() => {
          console.log('✅ Setup completado!');
          console.log('');
          console.log('🚀 Para iniciar el sistema completo ejecuta:');
          console.log('   npm run dev');
          resolve();
        }, 10000);
      }
    });
  });
}

function createEnvFile() {
  const envExamplePath = path.join(__dirname, '..', '.env.example');
  const envPath = path.join(__dirname, '..', '.env');
  
  if (!fs.existsSync(envPath)) {
    console.log('📝 Creando archivo .env desde .env.example...');
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ Archivo .env creado');
    console.log('⚠️  Recuerda configurar las variables de entorno para producción');
  } else {
    console.log('✅ Archivo .env ya existe');
  }
}

async function main() {
  try {
    await checkDockerRunning();
    createEnvFile();
    await setupDatabase();
  } catch (error) {
    console.error('❌ Setup falló:', error.message);
    process.exit(1);
  }
}

main();