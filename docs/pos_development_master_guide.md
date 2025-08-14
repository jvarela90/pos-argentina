# Guía Maestra de Desarrollo POS Argentina
## Manual de Implementación Técnica - Estándares de Excelencia

---

# FASE I: SETUP Y ARQUITECTURA BASE

## 1.1 Configuración del Entorno de Desarrollo

### Paso 1: Estructura del Proyecto (Día 1)
```bash
# Ejecutar por Tech Lead
mkdir pos-argentina-system
cd pos-argentina-system

# Crear estructura monorepo
npx create-nx-workspace@latest pos-system --preset=react-monorepo
cd pos-system

# Estructura final obligatoria
apps/
├── pos-terminal/          # PWA principal
├── pos-admin/             # Panel administrativo  
├── pos-api/               # Backend Node.js
└── pos-installer/         # App para instalar módulos

libs/
├── shared/
│   ├── ui-components/     # Componentes reutilizables
│   ├── utils/             # Funciones auxiliares
│   └── types/             # TypeScript definitions
├── modules/
│   ├── pos-core/          # Módulo base obligatorio
│   ├── inventory/         # Gestión inventario
│   ├── customers/         # Gestión clientes
│   ├── fiscal/            # Integración AFIP
│   ├── payments/          # Pagos digitales
│   └── reports/           # Reportes y analytics
└── integrations/
    ├── afip-sdk/          # SDK AFIP
    ├── mercadopago-sdk/   # SDK Mercado Pago
    └── hardware-drivers/  # Drivers impresoras/balanzas
```

**ESTÁNDAR DE EXCELENCIA**: Cada carpeta debe tener README.md, .gitignore específico, y package.json independiente.

### Paso 2: Configuración TypeScript (Día 1-2)
```typescript
// tsconfig.base.json - CONFIGURACIÓN MAESTRA
{
  "compileOnSave": false,
  "compilerOptions": {
    "rootDir": ".",
    "sourceMap": true,
    "declaration": false,
    "moduleResolution": "node",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "importHelpers": true,
    "target": "es2015",
    "module": "esnext",
    "lib": ["es2020", "dom"],
    "skipLibCheck": true,
    "skipDefaultLibCheck": true,
    "baseUrl": ".",
    "paths": {
      "@pos/shared/*": ["libs/shared/*"],
      "@pos/modules/*": ["libs/modules/*"],
      "@pos/integrations/*": ["libs/integrations/*"]
    },
    "strict": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

**CRITERIO DE ACEPTACIÓN**: 0 errores TypeScript en compilación, 100% tipado explícito.

### Paso 3: Setup Base de Datos (Día 2)
```sql
-- schema/base.sql - ESQUEMA MAESTRO
-- Ejecutar por Senior Backend

-- Tabla de configuración del sistema
CREATE TABLE system_config (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de módulos instalados
CREATE TABLE installed_modules (
    id SERIAL PRIMARY KEY,
    module_id VARCHAR(50) NOT NULL,
    version VARCHAR(20) NOT NULL,
    license_key VARCHAR(200) NOT NULL,
    active BOOLEAN DEFAULT true,
    config JSONB DEFAULT '{}',
    installed_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- Tabla de eventos del sistema (para sincronización)
CREATE TABLE system_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    module_id VARCHAR(50) NOT NULL,
    data JSONB NOT NULL,
    processed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de performance obligatorios
CREATE INDEX idx_events_unprocessed ON system_events(processed, created_at);
CREATE INDEX idx_modules_active ON installed_modules(active, module_id);
```

**ESTÁNDAR DE EXCELENCIA**: Todas las tablas deben tener created_at, updated_at, y índices optimizados.

---

# FASE II: DESARROLLO DEL CORE

## 2.1 Módulo POS-Core (Semanas 1-2)

### Paso 4: Base Class System (Senior Frontend)
```typescript
// libs/modules/pos-core/src/lib/base-module.ts
export abstract class BaseModule {
  protected config: ModuleConfig;
  protected eventBus: EventBus;
  protected storage: StorageManager;

  constructor(config: ModuleConfig) {
    this.config = config;
    this.eventBus = EventBus.getInstance();
    this.storage = new StorageManager(config.moduleId);
  }

  // Métodos obligatorios que debe implementar cada módulo
  abstract install(): Promise<boolean>;
  abstract uninstall(): Promise<boolean>;
  abstract getVersion(): string;
  abstract validateLicense(license: string): boolean;

  // Métodos opcionales con implementación por defecto
  configure(settings: Record<string, any>): void {
    this.config = { ...this.config, ...settings };
    this.storage.save('config', this.config);
  }

  emit(eventName: string, data: any): void {
    this.eventBus.emit(`${this.config.moduleId}:${eventName}`, data);
  }

  subscribe(eventName: string, handler: Function): void {
    this.eventBus.on(`${this.config.moduleId}:${eventName}`, handler);
  }
}

// Interfaces obligatorias
export interface ModuleConfig {
  moduleId: string;
  version: string;
  dependencies: string[];
  optional: boolean;
  price: number;
  trialDays: number;
}

export interface SaleItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  tax: number;
  discount: number;
}

export interface Sale {
  id: string;
  items: SaleItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string;
  customerId?: string;
  timestamp: Date;
  status: 'pending' | 'completed' | 'cancelled';
}
```

**CRITERIO DE ACEPTACIÓN**: Todas las clases deben extender BaseModule, implementar interfaces completas, y pasar tests unitarios.

### Paso 5: POS Core Implementation (Senior Frontend)
```typescript
// libs/modules/pos-core/src/lib/pos-core.module.ts
export class POSCoreModule extends BaseModule {
  private cart: CartManager;
  private paymentProcessor: PaymentProcessor;
  private printer: PrinterManager;

  constructor() {
    super({
      moduleId: 'pos-core',
      version: '1.0.0',
      dependencies: [],
      optional: false,
      price: 12000,
      trialDays: 30
    });

    this.cart = new CartManager(this.storage);
    this.paymentProcessor = new PaymentProcessor();
    this.printer = new PrinterManager();
  }

  async install(): Promise<boolean> {
    try {
      // Registrar componentes UI
      this.registerComponents();
      
      // Configurar eventos
      this.setupEventHandlers();
      
      // Inicializar storage local
      await this.initializeStorage();
      
      this.emit('module-installed', { moduleId: this.config.moduleId });
      return true;
    } catch (error) {
      console.error('Error installing POS Core:', error);
      return false;
    }
  }

  private registerComponents(): void {
    // Registrar Web Components
    customElements.define('pos-terminal', POSTerminalComponent);
    customElements.define('pos-cart', CartComponent);
    customElements.define('pos-payment', PaymentComponent);
  }

  // API pública del módulo
  public addToCart(product: Product, quantity: number = 1): boolean {
    const item: SaleItem = {
      id: generateId(),
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity,
      tax: product.tax || 0,
      discount: 0
    };

    const success = this.cart.addItem(item);
    if (success) {
      this.emit('item-added', item);
    }
    return success;
  }

  public removeFromCart(itemId: string): boolean {
    const success = this.cart.removeItem(itemId);
    if (success) {
      this.emit('item-removed', { itemId });
    }
    return success;
  }

  public async processSale(paymentData: PaymentData): Promise<SaleResult> {
    try {
      // Validar carrito
      if (this.cart.isEmpty()) {
        throw new Error('El carrito está vacío');
      }

      // Crear venta
      const sale: Sale = {
        id: generateId(),
        items: this.cart.getItems(),
        subtotal: this.cart.getSubtotal(),
        tax: this.cart.getTax(),
        discount: this.cart.getDiscount(),
        total: this.cart.getTotal(),
        paymentMethod: paymentData.method,
        customerId: paymentData.customerId,
        timestamp: new Date(),
        status: 'pending'
      };

      // Procesar pago
      const paymentResult = await this.paymentProcessor.process(paymentData);
      if (!paymentResult.success) {
        throw new Error(paymentResult.error);
      }

      // Completar venta
      sale.status = 'completed';
      await this.storage.save('sales', sale);

      // Imprimir ticket
      await this.printer.printReceipt(sale);

      // Limpiar carrito
      this.cart.clear();

      // Emitir evento
      this.emit('sale-completed', sale);

      return {
        success: true,
        sale,
        paymentResult
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
```

**ESTÁNDAR DE EXCELENCIA**: Toda función pública debe tener manejo de errores, logging, y emitir eventos apropiados.

### Paso 6: Cart Manager (Semi-Senior)
```typescript
// libs/modules/pos-core/src/lib/cart-manager.ts
export class CartManager {
  private items: Map<string, SaleItem> = new Map();
  private storage: StorageManager;

  constructor(storage: StorageManager) {
    this.storage = storage;
    this.loadFromStorage();
  }

  addItem(item: SaleItem): boolean {
    try {
      const existingItem = this.items.get(item.productId);
      
      if (existingItem) {
        // Sumar cantidades si el producto ya existe
        existingItem.quantity += item.quantity;
        this.items.set(item.productId, existingItem);
      } else {
        this.items.set(item.productId, item);
      }

      this.saveToStorage();
      return true;
    } catch (error) {
      console.error('Error adding item to cart:', error);
      return false;
    }
  }

  removeItem(itemId: string): boolean {
    const deleted = this.items.delete(itemId);
    if (deleted) {
      this.saveToStorage();
    }
    return deleted;
  }

  updateQuantity(itemId: string, quantity: number): boolean {
    const item = this.items.get(itemId);
    if (!item) return false;

    if (quantity <= 0) {
      return this.removeItem(itemId);
    }

    item.quantity = quantity;
    this.saveToStorage();
    return true;
  }

  getItems(): SaleItem[] {
    return Array.from(this.items.values());
  }

  getItemCount(): number {
    return Array.from(this.items.values())
      .reduce((count, item) => count + item.quantity, 0);
  }

  getSubtotal(): number {
    return Array.from(this.items.values())
      .reduce((total, item) => total + (item.price * item.quantity), 0);
  }

  getTax(): number {
    return Array.from(this.items.values())
      .reduce((tax, item) => tax + (item.price * item.quantity * item.tax / 100), 0);
  }

  getTotal(): number {
    return this.getSubtotal() + this.getTax() - this.getDiscount();
  }

  getDiscount(): number {
    return Array.from(this.items.values())
      .reduce((discount, item) => discount + item.discount, 0);
  }

  clear(): void {
    this.items.clear();
    this.saveToStorage();
  }

  isEmpty(): boolean {
    return this.items.size === 0;
  }

  private saveToStorage(): void {
    this.storage.save('cart', Array.from(this.items.values()));
  }

  private loadFromStorage(): void {
    const savedItems = this.storage.load('cart') || [];
    savedItems.forEach((item: SaleItem) => {
      this.items.set(item.productId, item);
    });
  }
}
```

**CRITERIO DE ACEPTACIÓN**: Cobertura de tests 90%, manejo de errores completo, persistencia automática.

---

# FASE III: COMPONENTES UI

## 3.1 Web Components Base (Semana 2)

### Paso 7: POS Terminal Component (Senior Frontend)
```typescript
// libs/modules/pos-core/src/lib/components/pos-terminal.component.ts
export class POSTerminalComponent extends HTMLElement {
  private posCore: POSCoreModule;
  private template: string;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.posCore = ModuleRegistry.get('pos-core');
    this.setupTemplate();
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  private setupTemplate(): void {
    this.template = `
      <style>
        :host {
          display: block;
          width: 100%;
          height: 100vh;
          font-family: 'Roboto', sans-serif;
        }
        
        .terminal-layout {
          display: grid;
          grid-template-columns: 2fr 1fr;
          height: 100%;
          gap: 1rem;
          padding: 1rem;
        }
        
        .products-section {
          background: #f5f5f5;
          border-radius: 8px;
          padding: 1rem;
          overflow-y: auto;
        }
        
        .cart-section {
          background: white;
          border-radius: 8px;
          padding: 1rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .product-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 0.5rem;
        }
        
        .product-btn {
          background: white;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          padding: 1rem;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
        }
        
        .product-btn:hover {
          border-color: #2196F3;
          transform: translateY(-2px);
        }
        
        .product-name {
          font-weight: bold;
          margin-bottom: 0.5rem;
        }
        
        .product-price {
          color: #4CAF50;
          font-size: 1.1rem;
        }
        
        .cart-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0;
          border-bottom: 1px solid #eee;
        }
        
        .cart-total {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 2px solid #333;
          font-size: 1.5rem;
          font-weight: bold;
        }
        
        .payment-buttons {
          display: grid;
          gap: 0.5rem;
          margin-top: 1rem;
        }
        
        .btn {
          padding: 1rem;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1rem;
          transition: background-color 0.2s;
        }
        
        .btn-primary {
          background: #2196F3;
          color: white;
        }
        
        .btn-success {
          background: #4CAF50;
          color: white;
        }
        
        @media (max-width: 768px) {
          .terminal-layout {
            grid-template-columns: 1fr;
            grid-template-rows: 1fr auto;
          }
        }
      </style>
      
      <div class="terminal-layout">
        <div class="products-section">
          <h2>Productos</h2>
          <div class="product-search">
            <input type="text" id="search" placeholder="Buscar producto..." />
          </div>
          <div class="product-grid" id="productGrid">
            <!-- Productos se cargan dinámicamente -->
          </div>
        </div>
        
        <div class="cart-section">
          <h3>Carrito</h3>
          <div id="cartItems">
            <!-- Items del carrito -->
          </div>
          <div class="cart-total">
            Total: $<span id="totalAmount">0</span>
          </div>
          <div class="payment-buttons">
            <button class="btn btn-success" id="payBtn">
              COBRAR
            </button>
            <button class="btn btn-primary" id="clearBtn">
              LIMPIAR
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private render(): void {
    this.shadowRoot!.innerHTML = this.template;
    this.loadProducts();
    this.updateCart();
  }

  private setupEventListeners(): void {
    // Búsqueda de productos
    const searchInput = this.shadowRoot!.getElementById('search') as HTMLInputElement;
    searchInput.addEventListener('input', (e) => {
      this.filterProducts((e.target as HTMLInputElement).value);
    });

    // Botones de pago
    const payBtn = this.shadowRoot!.getElementById('payBtn');
    payBtn!.addEventListener('click', () => this.handlePayment());

    const clearBtn = this.shadowRoot!.getElementById('clearBtn');
    clearBtn!.addEventListener('click', () => this.clearCart());

    // Eventos del módulo POS
    this.posCore.subscribe('item-added', () => this.updateCart());
    this.posCore.subscribe('item-removed', () => this.updateCart());
  }

  private async loadProducts(): Promise<void> {
    try {
      const products = await this.getProducts();
      this.renderProducts(products);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  }

  private renderProducts(products: Product[]): void {
    const grid = this.shadowRoot!.getElementById('productGrid');
    grid!.innerHTML = products.map(product => `
      <div class="product-btn" data-product-id="${product.id}">
        <div class="product-name">${product.name}</div>
        <div class="product-price">$${product.price}</div>
      </div>
    `).join('');

    // Agregar event listeners a productos
    grid!.addEventListener('click', (e) => {
      const productBtn = (e.target as HTMLElement).closest('.product-btn');
      if (productBtn) {
        const productId = productBtn.getAttribute('data-product-id');
        this.addProductToCart(productId!);
      }
    });
  }
}

// Registrar el componente
customElements.define('pos-terminal', POSTerminalComponent);
```

**ESTÁNDAR DE EXCELENCIA**: Todos los componentes deben ser responsivos, accesibles (WCAG 2.1), y funcionar offline.

---

# FASE IV: SISTEMA DE MÓDULOS

## 4.1 Module Registry System (Semana 3)

### Paso 8: Module Registry (Tech Lead)
```typescript
// libs/shared/src/lib/module-registry.ts
export class ModuleRegistry {
  private static instance: ModuleRegistry;
  private modules: Map<string, BaseModule> = new Map();
  private dependencies: Map<string, string[]> = new Map();

  static getInstance(): ModuleRegistry {
    if (!ModuleRegistry.instance) {
      ModuleRegistry.instance = new ModuleRegistry();
    }
    return ModuleRegistry.instance;
  }

  async registerModule(moduleClass: typeof BaseModule, config: ModuleConfig): Promise<boolean> {
    try {
      // Verificar dependencias
      const missingDeps = this.checkDependencies(config.dependencies);
      if (missingDeps.length > 0) {
        throw new Error(`Missing dependencies: ${missingDeps.join(', ')}`);
      }

      // Crear instancia del módulo
      const moduleInstance = new moduleClass(config);

      // Validar licencia si no es módulo core
      if (config.moduleId !== 'pos-core') {
        const licenseValid = await this.validateModuleLicense(config);
        if (!licenseValid) {
          throw new Error('Invalid or expired license');
        }
      }

      // Instalar módulo
      const installed = await moduleInstance.install();
      if (!installed) {
        throw new Error('Module installation failed');
      }

      // Registrar en el sistema
      this.modules.set(config.moduleId, moduleInstance);
      this.dependencies.set(config.moduleId, config.dependencies);

      // Guardar en base de datos
      await this.saveModuleToDatabase(config);

      return true;
    } catch (error) {
      console.error(`Error registering module ${config.moduleId}:`, error);
      return false;
    }
  }

  async unregisterModule(moduleId: string): Promise<boolean> {
    try {
      // Verificar dependencias (no se puede desinstalar si otros dependen)
      const dependents = this.findDependents(moduleId);
      if (dependents.length > 0) {
        throw new Error(`Cannot uninstall. Required by: ${dependents.join(', ')}`);
      }

      const module = this.modules.get(moduleId);
      if (!module) {
        return false;
      }

      // Desinstalar módulo
      await module.uninstall();

      // Remover del registro
      this.modules.delete(moduleId);
      this.dependencies.delete(moduleId);

      // Actualizar base de datos
      await this.removeModuleFromDatabase(moduleId);

      return true;
    } catch (error) {
      console.error(`Error unregistering module ${moduleId}:`, error);
      return false;
    }
  }

  get<T extends BaseModule>(moduleId: string): T {
    const module = this.modules.get(moduleId);
    if (!module) {
      throw new Error(`Module ${moduleId} not found`);
    }
    return module as T;
  }

  getAll(): BaseModule[] {
    return Array.from(this.modules.values());
  }

  isInstalled(moduleId: string): boolean {
    return this.modules.has(moduleId);
  }

  private checkDependencies(dependencies: string[]): string[] {
    return dependencies.filter(dep => !this.modules.has(dep));
  }

  private findDependents(moduleId: string): string[] {
    const dependents: string[] = [];
    this.dependencies.forEach((deps, mod) => {
      if (deps.includes(moduleId)) {
        dependents.push(mod);
      }
    });
    return dependents;
  }

  private async validateModuleLicense(config: ModuleConfig): Promise<boolean> {
    // Implementar validación de licencia
    // Verificar contra servidor de licencias
    return true;
  }
}
```

### Paso 9: Hot Module Replacement (Senior Backend)
```typescript
// libs/shared/src/lib/hot-module-replacement.ts
export class HotModuleReplacement {
  private watchers: Map<string, FSWatcher> = new Map();
  private moduleRegistry: ModuleRegistry;

  constructor() {
    this.moduleRegistry = ModuleRegistry.getInstance();
  }

  watchModule(moduleId: string, modulePath: string): void {
    if (process.env.NODE_ENV !== 'development') {
      return; // Solo en desarrollo
    }

    const watcher = chokidar.watch(modulePath, {
      ignored: /node_modules/,
      persistent: true
    });

    watcher.on('change', async (path) => {
      console.log(`Module ${moduleId} changed: ${path}`);
      await this.reloadModule(moduleId);
    });

    this.watchers.set(moduleId, watcher);
  }

  private async reloadModule(moduleId: string): Promise<void> {
    try {
      // Descargar módulo actualizado del servidor
      const moduleCode = await this.downloadModule(moduleId);
      
      // Crear nueva instancia del módulo
      const moduleClass = await this.loadModuleFromCode(moduleCode);
      
      // Desinstalar versión anterior
      if (this.moduleRegistry.isInstalled(moduleId)) {
        await this.moduleRegistry.unregisterModule(moduleId);
      }
      
      // Instalar nueva versión
      const config = await this.getModuleConfig(moduleId);
      await this.moduleRegistry.registerModule(moduleClass, config);
      
      // Notificar a la UI
      EventBus.getInstance().emit('module-reloaded', { moduleId });
      
    } catch (error) {
      console.error(`Error reloading module ${moduleId}:`, error);
    }
  }

  private async downloadModule(moduleId: string): Promise<string> {
    const response = await fetch(`/api/modules/${moduleId}/latest`);
    return await response.text();
  }

  private async loadModuleFromCode(code: string): Promise<typeof BaseModule> {
    // Usar dynamic import para cargar código como módulo
    const blob = new Blob([code], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const module = await import(url);
    URL.revokeObjectURL(url);
    return module.default;
  }
}
```

---

# FASE V: ESPECIFICACIONES TÉCNICAS

## 5.1 Estándares de Calidad Obligatorios

### Testing Requirements
```typescript
// Cada módulo DEBE tener estos tests mínimos

// 1. Unit Tests - Cobertura mínima 85%
describe('POSCoreModule', () => {
  test('should add item to cart correctly', () => {
    const posCore = new POSCoreModule();
    const product = { id: '1', name: 'Test', price: 100 };
    
    const result = posCore.addToCart(product, 2);
    
    expect(result).toBe(true);
    expect(posCore.getCartTotal()).toBe(200);
  });

  test('should handle payment processing', async () => {
    const posCore = new POSCoreModule();
    // Setup cart
    posCore.addToCart({ id: '1', name: 'Test', price: 100 }, 1);
    
    const result = await posCore.processSale({
      method: 'cash',
      amount: 100
    });
    
    expect(result.success).toBe(true);
    expect(result.sale.total).toBe(100);
  });
});

// 2. Integration Tests
describe('Module Integration', () => {
  test('should integrate with inventory module', async () => {
    const registry = ModuleRegistry.getInstance();
    await registry.registerModule(POSCoreModule, posConfig);
    await registry.registerModule(InventoryModule, invConfig);
    
    const posCore = registry.get('pos-core');
    const inventory = registry.get('inventory');
    
    // Test que venta reduzca stock
    const product = inventory.getProduct('1');
    const initialStock = product.stock;
    
    await posCore.addToCart(product, 1);
    await posCore.processSale({ method: 'cash', amount: product.price });
    
    const updatedProduct = inventory.getProduct('1');
    expect(updatedProduct.stock).toBe(initialStock - 1);
  });
});

// 3. E2E Tests con Cypress
describe('POS Terminal E2E', () => {
  it('should complete a sale end-to-end', () => {
    cy.visit('/pos-terminal');
    cy.get('[data-testid="product-button-1"]').click();
    cy.get('[data-testid="cart-total"]').should('contain', '$100');
    cy.get('[data-testid="pay-button"]').click();
    cy.get('[data-testid="payment-success"]').should('be.visible');
  });
});
```

### Performance Requirements
```typescript
// Métricas obligatorias - monitoreadas automáticamente

const PERFORMANCE_STANDARDS = {
  // Tiempo de carga inicial
  INITIAL_LOAD: 3000, // 3 segundos máximo
  
  // Tiempo de respuesta de operaciones
  ADD_TO_CART: 100,     // 100ms máximo
  PROCESS_PAYMENT: 500, // 500ms máximo
  SEARCH_PRODUCT: 200,  // 200ms máximo
  
  // Sincronización
  OFFLINE_SYNC: 5000,   // 5 segundos máximo
  
  // Tamaño de bundles
  CORE_BUNDLE: 500,     // 500KB máximo
  MODULE_BUNDLE: 200,   // 200KB máximo por módulo
  
  // Memoria
  MAX_MEMORY: 50,       // 50MB máximo por tab
  
  // Offline capability
  OFFLINE_DURATION: 72  // 72 horas mínimo
};

// Monitor automático de performance
class PerformanceMonitor {
  static measure(operation: string): PerformanceDecorator {
    return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
      const method = descriptor.value;
      
      descriptor.value = async function (...args: any[]) {
        const start = performance.now();
        const result = await method.apply(this, args);
        const duration = performance.now() - start;
        
        if (duration > PERFORMANCE_STANDARDS[operation]) {
          console.warn(`Performance warning: ${operation} took ${duration}ms`);
        }
        
        return result;
      };
    };
  }
}
```

### Security Standards
```typescript
// Seguridad obligatoria en todos los módulos

class SecurityManager {
  // 1. Encriptación de datos sensibles
  static encrypt(data: string): string {
    const key = crypto.getRandomValues(new Uint8Array(32));
    // Usar Web Crypto API
    return encrypted;
  }

  // 2. Validación de inputs
  static validateInput(input: any, schema: ValidationSchema): boolean {
    // Implementar validación estricta
    return true;
  }

  // 3. Sanitización de datos
  static sanitize(data: string): string {
    return DOMPurify.sanitize(data);
  }

  // 4. Control de acceso
  static checkPermission(moduleId: string, action: string): boolean {
    // Verificar permisos del módulo
    return true;
  }
}

// Decorador obligatorio para métodos sensibles
function Secure(permission: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = function (...args: any[]) {
      if (!SecurityManager.checkPermission(this.config.moduleId, permission)) {
        throw new Error('Access denied');
      }
      return method.apply(this, args);
    };
  };
}
```

---

# FASE VI: DEPLOYMENT Y DEVOPS

## 6.1 Containerización (Senior Backend)

### Dockerfile Optimizado
```dockerfile
# Dockerfile - Multi-stage build optimizado
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Imagen de producción
FROM node:18-alpine AS production

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

WORKDIR /app

# Copiar archivos necesarios
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Configurar ownership
USER nextjs

EXPOSE 3000

# Health check obligatorio
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "dist/main.js"]
```

### Docker Compose para Desarrollo
```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  pos-api:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/pos_dev
      - REDIS_URL=redis://redis:6379
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      - db
      - redis

  pos-terminal:
    build:
      context: ./apps/pos-terminal
      dockerfile: Dockerfile.dev
    ports:
      - "4200:4200"
    volumes:
      - ./apps/pos-terminal:/app
      - /app/node_modules

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: pos_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

## 6.2 CI/CD Pipeline

### GitHub Actions Workflow
```yaml
# .github/workflows/ci-cd.yml
name: POS System CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: pos_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linting
        run: npm run lint
      
      - name: Run unit tests
        run: npm run test:unit
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost/pos_test
      
      - name: Run integration tests
        run: npm run test:integration
      
      - name: Build application
        run: npm run build
      
      - name: Run E2E tests
        run: npm run test:e2e

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run security audit
        run: npm audit --audit-level high
      
      - name: Run SAST scan
        uses: github/super-linter@v4
        env:
          DEFAULT_BRANCH: main
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  deploy-staging:
    needs: [test, security]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to staging
        run: |
          # Deploy logic here
          echo "Deploying to staging..."

  deploy-production:
    needs: [test, security]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to production
        run: |
          # Production deployment logic
          echo "Deploying to production..."
```

---

# LISTA DE TAREAS PARA PROGRAMADORES

## CHECKLIST OBLIGATORIO - NO NEGOCIABLE

### ✅ SETUP INICIAL (Día 1-2)
- [ ] Crear estructura monorepo con Nx
- [ ] Configurar TypeScript con strict mode
- [ ] Setup ESLint + Prettier con reglas estrictas
- [ ] Configurar base de datos PostgreSQL + Redis
- [ ] Implementar Docker para desarrollo
- [ ] Setup testing framework (Jest + Cypress)

### ✅ ARQUITECTURA BASE (Semana 1)
- [ ] Implementar BaseModule class abstracta
- [ ] Crear ModuleRegistry singleton
- [ ] Implementar EventBus para comunicación
- [ ] Crear StorageManager para persistencia
- [ ] Setup Hot Module Replacement
- [ ] Implementar SecurityManager

### ✅ POS CORE (Semana 1-2)
- [ ] Desarrollar POSCoreModule completo
- [ ] Implementar CartManager con persistencia
- [ ] Crear PaymentProcessor básico
- [ ] Desarrollar PrinterManager
- [ ] Implementar POSTerminalComponent
- [ ] Tests unitarios + integración (85% coverage)

### ✅ MÓDULOS ESPECÍFICOS (Semana 2-4)
- [ ] InventoryModule con CRUD completo
- [ ] CustomersModule con sistema de fiado
- [ ] FiscalModule con integración AFIP
- [ ] PaymentsModule con Mercado Pago
- [ ] ReportsModule con dashboard básico
- [ ] Cada módulo con tests independientes

### ✅ INTEGRACIÓN Y CALIDAD (Semana 4)
- [ ] Tests E2E completos
- [ ] Performance monitoring
- [ ] Security audit completo
- [ ] Documentación técnica completa
- [ ] Setup CI/CD pipeline
- [ ] Deploy staging + producción

---

# CRITERIOS DE ACEPTACIÓN OBLIGATORIOS

## CÓDIGO
- **0 errores TypeScript**
- **0 warnings ESLint**
- **85% test coverage mínimo**
- **Máximo 200 líneas por archivo**
- **Máximo 4 parámetros por función**
- **Todas las funciones públicas documentadas**

## PERFORMANCE
- **< 3 segundos carga inicial**
- **< 500ms operaciones críticas**
- **< 200KB por módulo**
- **72 horas offline mínimo**

## SEGURIDAD
- **Validación de todos los inputs**
- **Encriptación datos sensibles**
- **Control de acceso por módulo**
- **Audit log de transacciones**

## USABILIDAD
- **Responsive design obligatorio**
- **WCAG 2.1 compliance**
- **Funciona sin mouse (solo teclado)**
- **Soporte offline completo**

Este es el estándar de excelencia que no se negocia. Cada commit debe pasar todos estos criterios antes de merge a main.