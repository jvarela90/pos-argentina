#!/usr/bin/env node
/**
 * Script para crear un nuevo módulo
 * Uso: npm run create:module nombre-del-modulo
 */

const fs = require('fs');
const path = require('path');

function createModuleStructure(moduleName) {
  const moduleDir = path.join(__dirname, '..', 'packages', moduleName);
  
  // Crear directorios
  const dirs = [
    moduleDir,
    path.join(moduleDir, 'src'),
    path.join(moduleDir, 'src', 'components'),
    path.join(moduleDir, 'src', 'services'),
    path.join(moduleDir, 'src', 'types'),
    path.join(moduleDir, 'tests')
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Creado: ${dir}`);
    }
  });

  // package.json
  const packageJson = {
    name: `@pos-argentina/${moduleName}`,
    version: "0.1.0",
    description: `Módulo ${moduleName} del sistema POS`,
    main: "dist/index.js",
    types: "dist/index.d.ts",
    scripts: {
      build: "tsc",
      dev: "tsc --watch",
      test: "jest"
    },
    dependencies: {
      "@pos-argentina/shared": "workspace:*"
    },
    devDependencies: {
      typescript: "^5.2.2"
    }
  };

  fs.writeFileSync(
    path.join(moduleDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  // tsconfig.json
  const tsconfig = {
    extends: "../../tsconfig.base.json",
    compilerOptions: {
      outDir: "dist",
      rootDir: "src",
      declaration: true,
      declarationMap: true,
      sourceMap: true
    },
    include: ["src/**/*"],
    exclude: ["dist", "node_modules", "**/*.test.ts", "**/*.spec.ts"]
  };

  fs.writeFileSync(
    path.join(moduleDir, 'tsconfig.json'),
    JSON.stringify(tsconfig, null, 2)
  );

  // Clase principal del módulo
  const moduleClass = `import { 
  BaseModule, 
  ModuleConfig, 
  SystemEvents 
} from '@pos-argentina/shared';

/**
 * Módulo ${moduleName} 
 * Descripción de funcionalidad
 */
export class ${capitalizeFirst(toCamelCase(moduleName))}Module extends BaseModule {
  constructor() {
    super({
      id: '${moduleName}',
      name: '${capitalizeFirst(moduleName.replace('-', ' '))}',
      version: '0.1.0',
      dependencies: ['pos-core'], // Módulos requeridos
      optional: true,
      price: 3000, // Precio en ARS/mes
      trialDays: 15,
      description: 'Descripción del módulo'
    });

    console.log(\`🧩 \${this.config.name} Module initialized\`);
  }

  async install(): Promise<boolean> {
    try {
      console.log('📦 Installing ${moduleName} module...');
      
      // Lógica de instalación del módulo
      await this.initializeStorage();
      this.setupEventHandlers();
      
      this.emit(SystemEvents.MODULE_INSTALLED, { 
        moduleId: this.config.id,
        timestamp: new Date()
      });

      console.log('✅ ${moduleName} module installed successfully');
      return true;
    } catch (error) {
      console.error('❌ ${moduleName} installation failed:', error);
      return false;
    }
  }

  async uninstall(): Promise<boolean> {
    try {
      console.log('🗑️ Uninstalling ${moduleName} module...');
      
      // Lógica de desinstalación
      this.cleanupEventHandlers();
      
      this.emit(SystemEvents.MODULE_UNINSTALLED, { 
        moduleId: this.config.id,
        timestamp: new Date()
      });

      console.log('✅ ${moduleName} module uninstalled successfully');
      return true;
    } catch (error) {
      console.error('❌ ${moduleName} uninstall failed:', error);
      return false;
    }
  }

  getVersion(): string {
    return this.config.version;
  }

  // ===========================================
  // API PÚBLICA DEL MÓDULO
  // ===========================================

  /**
   * Función ejemplo del módulo
   */
  exampleFunction(): string {
    return 'Hello from ${moduleName} module!';
  }

  // ===========================================
  // MÉTODOS PRIVADOS
  // ===========================================

  private async initializeStorage(): Promise<void> {
    // Inicializar datos del módulo
    if (!this.storage.exists('config')) {
      this.storage.save('config', {
        enabled: true,
        settings: {}
      });
    }
  }

  private setupEventHandlers(): void {
    // Configurar listeners de eventos
    this.subscribeToAll((event) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(\`📡 \${this.config.name} received event:\`, event);
      }
    });
  }

  private cleanupEventHandlers(): void {
    // Limpiar listeners
    this.eventBus.removeAllListeners(\`\${this.config.id}:*\`);
  }
}
`;

  fs.writeFileSync(
    path.join(moduleDir, 'src', `${moduleName}.module.ts`),
    moduleClass
  );

  // index.ts
  const indexContent = `// Exportaciones principales del módulo ${moduleName}
export { ${capitalizeFirst(toCamelCase(moduleName))}Module } from './${moduleName}.module';

// Exportar tipos específicos del módulo
export * from './types';
`;

  fs.writeFileSync(
    path.join(moduleDir, 'src', 'index.ts'),
    indexContent
  );

  // types/index.ts
  const typesContent = `// Tipos específicos del módulo ${moduleName}

export interface ${capitalizeFirst(toCamelCase(moduleName))}Config {
  enabled: boolean;
  settings: Record<string, any>;
}

export interface ${capitalizeFirst(toCamelCase(moduleName))}Data {
  id: string;
  name: string;
  created: Date;
  updated: Date;
}
`;

  fs.writeFileSync(
    path.join(moduleDir, 'src', 'types', 'index.ts'),
    typesContent
  );

  // README.md
  const readmeContent = `# ${capitalizeFirst(moduleName.replace('-', ' '))} Module

Módulo ${moduleName} del sistema POS Argentina.

## Instalación

El módulo se instala automáticamente cuando se activa desde el panel de administración.

## Configuración

\`\`\`typescript
const module = new ${capitalizeFirst(toCamelCase(moduleName))}Module();
await module.activate();
\`\`\`

## API

### Funciones principales

- \`exampleFunction()\`: Función de ejemplo

## Desarrollo

\`\`\`bash
# Compilar
npm run build

# Modo desarrollo
npm run dev

# Tests
npm run test
\`\`\`
`;

  fs.writeFileSync(
    path.join(moduleDir, 'README.md'),
    readmeContent
  );

  console.log(`✅ Módulo ${moduleName} creado exitosamente`);
  console.log(`📁 Ubicación: packages/${moduleName}`);
  console.log('');
  console.log('Próximos pasos:');
  console.log(`1. cd packages/${moduleName}`);
  console.log('2. Implementar la lógica específica del módulo');
  console.log('3. Agregar tests en la carpeta tests/');
  console.log('4. Ejecutar npm run build para compilar');
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function toCamelCase(str) {
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

// Main
const moduleName = process.argv[2];

if (!moduleName) {
  console.error('❌ Debes especificar el nombre del módulo');
  console.log('Uso: npm run create:module nombre-del-modulo');
  process.exit(1);
}

if (!/^[a-z0-9-]+$/.test(moduleName)) {
  console.error('❌ El nombre del módulo solo puede contener letras minúsculas, números y guiones');
  process.exit(1);
}

console.log(`🧩 Creando módulo: ${moduleName}`);
createModuleStructure(moduleName);