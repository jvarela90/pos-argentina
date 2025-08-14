import { BaseModule, ModuleConfig, Product, EventBus, SystemEvents } from '@pos-argentina/shared';
import { InventoryManager } from './services/inventory-manager';
import { SupplierManager } from './services/supplier-manager';
import { StockMovementTracker } from './services/stock-movement-tracker';
import { AlertsManager } from './services/alerts-manager';

export interface InventoryModuleEvents {
  STOCK_LOW: 'inventory:stock_low';
  STOCK_OUT: 'inventory:stock_out';
  PRODUCT_UPDATED: 'inventory:product_updated';
  MOVEMENT_RECORDED: 'inventory:movement_recorded';
  SUPPLIER_UPDATED: 'inventory:supplier_updated';
}

export const InventoryEvents: InventoryModuleEvents = {
  STOCK_LOW: 'inventory:stock_low',
  STOCK_OUT: 'inventory:stock_out',
  PRODUCT_UPDATED: 'inventory:product_updated',
  MOVEMENT_RECORDED: 'inventory:movement_recorded',
  SUPPLIER_UPDATED: 'inventory:supplier_updated'
};

export interface StockMovement {
  id: string;
  productId: string;
  type: 'entrada' | 'salida' | 'ajuste';
  quantity: number;
  reason: string;
  userId: string;
  cost?: number;
  reference?: string;
  date: Date;
  notes?: string;
}

export interface Supplier {
  id: string;
  name: string;
  cuit: string;
  address: string;
  phone: string;
  email: string;
  contact: string;
  paymentTerms: string;
  active: boolean;
  created: Date;
  updated: Date;
}

export interface StockAlert {
  id: string;
  productId: string;
  type: 'low_stock' | 'out_of_stock' | 'expired';
  threshold: number;
  currentStock: number;
  message: string;
  active: boolean;
  created: Date;
}

export class InventoryModule extends BaseModule {
  private inventoryManager: InventoryManager;
  private supplierManager: SupplierManager;
  private stockTracker: StockMovementTracker;
  private alertsManager: AlertsManager;

  constructor() {
    super();
    this.inventoryManager = new InventoryManager();
    this.supplierManager = new SupplierManager();
    this.stockTracker = new StockMovementTracker();
    this.alertsManager = new AlertsManager();
  }

  getConfig(): ModuleConfig {
    return {
      id: 'inventory',
      name: 'Gestión de Inventario',
      description: 'Control completo de stock, proveedores y movimientos de inventario',
      version: '1.0.0',
      author: 'POS Argentina',
      category: 'core',
      optional: false,
      dependencies: [],
      price: 18000,
      trialDays: 15,
      features: [
        'Control de stock en tiempo real',
        'Gestión de proveedores',
        'Histórico de movimientos',
        'Alertas de stock bajo',
        'Gestión de costos',
        'Reportes de inventario',
        'Códigos de barras',
        'Múltiples ubicaciones'
      ]
    };
  }

  async onInstall(): Promise<boolean> {
    try {
      console.log('Instalando módulo de inventario...');
      
      await this.inventoryManager.initialize();
      await this.supplierManager.initialize();
      await this.stockTracker.initialize();
      await this.alertsManager.initialize();

      this.setupEventListeners();
      
      console.log('Módulo de inventario instalado correctamente');
      return true;
    } catch (error) {
      console.error('Error instalando módulo de inventario:', error);
      return false;
    }
  }

  async onUninstall(): Promise<boolean> {
    try {
      console.log('Desinstalando módulo de inventario...');
      
      this.removeEventListeners();
      
      await this.alertsManager.cleanup();
      await this.stockTracker.cleanup();
      await this.supplierManager.cleanup();
      await this.inventoryManager.cleanup();
      
      console.log('Módulo de inventario desinstalado correctamente');
      return true;
    } catch (error) {
      console.error('Error desinstalando módulo de inventario:', error);
      return false;
    }
  }

  async onActivate(): Promise<void> {
    console.log('Activando módulo de inventario...');
    
    await this.inventoryManager.activate();
    await this.supplierManager.activate();
    await this.stockTracker.activate();
    await this.alertsManager.activate();
    
    this.startPeriodicTasks();
    
    EventBus.emit(SystemEvents.MODULE_ACTIVATED, { moduleId: this.getId() });
  }

  async onDeactivate(): Promise<void> {
    console.log('Desactivando módulo de inventario...');
    
    this.stopPeriodicTasks();
    
    await this.alertsManager.deactivate();
    await this.stockTracker.deactivate();
    await this.supplierManager.deactivate();
    await this.inventoryManager.deactivate();
    
    EventBus.emit(SystemEvents.MODULE_DEACTIVATED, { moduleId: this.getId() });
  }

  validateLicense(license: string): boolean {
    const validFormats = [
      'POS-INVENTORY-SYSTEM-',
      'POS-INV-PREMIUM-',
      'POS-STOCK-PRO-'
    ];
    
    return validFormats.some(format => license.startsWith(format)) && 
           license.length >= 20;
  }

  // Métodos públicos del módulo

  async addProduct(product: Omit<Product, 'id' | 'created' | 'updated'>): Promise<Product> {
    const newProduct = await this.inventoryManager.addProduct(product);
    
    EventBus.emit(InventoryEvents.PRODUCT_UPDATED, { 
      action: 'created', 
      product: newProduct 
    });
    
    return newProduct;
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
    const updatedProduct = await this.inventoryManager.updateProduct(id, updates);
    
    if (updatedProduct) {
      EventBus.emit(InventoryEvents.PRODUCT_UPDATED, { 
        action: 'updated', 
        product: updatedProduct 
      });
      
      // Verificar alertas de stock
      await this.alertsManager.checkProductAlerts(updatedProduct);
    }
    
    return updatedProduct;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const result = await this.inventoryManager.deleteProduct(id);
    
    if (result) {
      EventBus.emit(InventoryEvents.PRODUCT_UPDATED, { 
        action: 'deleted', 
        productId: id 
      });
    }
    
    return result;
  }

  async getProduct(id: string): Promise<Product | null> {
    return this.inventoryManager.getProduct(id);
  }

  async getAllProducts(): Promise<Product[]> {
    return this.inventoryManager.getAllProducts();
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    return this.inventoryManager.getProductsByCategory(category);
  }

  async searchProducts(query: string): Promise<Product[]> {
    return this.inventoryManager.searchProducts(query);
  }

  async recordStockMovement(movement: Omit<StockMovement, 'id' | 'date'>): Promise<StockMovement> {
    const newMovement = await this.stockTracker.recordMovement(movement);
    
    // Actualizar stock del producto
    const product = await this.getProduct(movement.productId);
    if (product) {
      let newStock = product.stock;
      
      switch (movement.type) {
        case 'entrada':
          newStock += movement.quantity;
          break;
        case 'salida':
          newStock -= movement.quantity;
          break;
        case 'ajuste':
          newStock = movement.quantity;
          break;
      }
      
      await this.updateProduct(movement.productId, { stock: newStock });
    }
    
    EventBus.emit(InventoryEvents.MOVEMENT_RECORDED, { movement: newMovement });
    
    return newMovement;
  }

  async getStockMovements(productId?: string, limit?: number): Promise<StockMovement[]> {
    return this.stockTracker.getMovements(productId, limit);
  }

  async addSupplier(supplier: Omit<Supplier, 'id' | 'created' | 'updated'>): Promise<Supplier> {
    const newSupplier = await this.supplierManager.addSupplier(supplier);
    
    EventBus.emit(InventoryEvents.SUPPLIER_UPDATED, { 
      action: 'created', 
      supplier: newSupplier 
    });
    
    return newSupplier;
  }

  async updateSupplier(id: string, updates: Partial<Supplier>): Promise<Supplier | null> {
    const updatedSupplier = await this.supplierManager.updateSupplier(id, updates);
    
    if (updatedSupplier) {
      EventBus.emit(InventoryEvents.SUPPLIER_UPDATED, { 
        action: 'updated', 
        supplier: updatedSupplier 
      });
    }
    
    return updatedSupplier;
  }

  async getAllSuppliers(): Promise<Supplier[]> {
    return this.supplierManager.getAllSuppliers();
  }

  async getActiveAlerts(): Promise<StockAlert[]> {
    return this.alertsManager.getActiveAlerts();
  }

  async dismissAlert(alertId: string): Promise<boolean> {
    return this.alertsManager.dismissAlert(alertId);
  }

  async generateInventoryReport(): Promise<{
    totalProducts: number;
    totalValue: number;
    lowStockProducts: number;
    outOfStockProducts: number;
    categories: Record<string, number>;
  }> {
    return this.inventoryManager.generateReport();
  }

  // Métodos privados

  private setupEventListeners(): void {
    // Escuchar ventas para actualizar stock
    EventBus.on('pos:sale_completed', this.handleSaleCompleted.bind(this));
    
    // Escuchar cambios de productos para verificar alertas
    EventBus.on(InventoryEvents.PRODUCT_UPDATED, this.handleProductUpdated.bind(this));
  }

  private removeEventListeners(): void {
    EventBus.off('pos:sale_completed', this.handleSaleCompleted.bind(this));
    EventBus.off(InventoryEvents.PRODUCT_UPDATED, this.handleProductUpdated.bind(this));
  }

  private async handleSaleCompleted(data: any): Promise<void> {
    if (data.sale && data.sale.items) {
      for (const item of data.sale.items) {
        await this.recordStockMovement({
          productId: item.productId,
          type: 'salida',
          quantity: item.quantity,
          reason: 'Venta',
          userId: data.sale.userId || 'system',
          reference: data.sale.id
        });
      }
    }
  }

  private async handleProductUpdated(data: any): Promise<void> {
    if (data.product) {
      await this.alertsManager.checkProductAlerts(data.product);
    }
  }

  private startPeriodicTasks(): void {
    // Verificar alertas cada 5 minutos
    setInterval(() => {
      this.alertsManager.checkAllAlerts();
    }, 5 * 60 * 1000);
  }

  private stopPeriodicTasks(): void {
    // Limpiar intervalos si es necesario
  }
}