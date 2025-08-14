// Exportaciones principales del módulo de inventario
export { InventoryModule } from './inventory.module';
export type { 
  StockMovement, 
  Supplier, 
  StockAlert, 
  InventoryModuleEvents 
} from './inventory.module';
export { InventoryEvents } from './inventory.module';

// Servicios
export { InventoryManager } from './services/inventory-manager';
export { SupplierManager } from './services/supplier-manager';
export { StockMovementTracker } from './services/stock-movement-tracker';
export { AlertsManager } from './services/alerts-manager';