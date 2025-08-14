import { Product, StorageManager, EventBus, offlineStorage } from '@pos-argentina/shared';
import { StockAlert, InventoryEvents } from '../inventory.module';

export class AlertsManager {
  private storage: StorageManager;
  private alerts: Map<string, StockAlert> = new Map();
  private alertsCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.storage = new StorageManager('stock_alerts');
  }

  async initialize(): Promise<void> {
    console.log('Inicializando gestor de alertas...');
    await this.loadAlerts();
  }

  async activate(): Promise<void> {
    await this.loadAlerts();
    this.startAlertsMonitoring();
    console.log(`Gestor de alertas activado con ${this.alerts.size} alertas`);
  }

  async deactivate(): Promise<void> {
    this.stopAlertsMonitoring();
    console.log('Gestor de alertas desactivado');
  }

  async cleanup(): Promise<void> {
    this.stopAlertsMonitoring();
    this.alerts.clear();
    console.log('Alertas limpiadas');
  }

  private async loadAlerts(): Promise<void> {
    try {
      // Cargar desde offline storage primero
      const offlineAlerts = await offlineStorage.getAll<StockAlert>('alerts');
      
      // Si no hay alertas offline, cargar desde localStorage
      if (offlineAlerts.length === 0) {
        const localAlerts = this.storage.load<StockAlert[]>('alerts') || [];
        
        // Migrar a offline storage
        for (const alert of localAlerts) {
          await offlineStorage.set('alerts', alert.id, alert, true);
        }
        
        localAlerts.forEach(alert => {
          this.alerts.set(alert.id, alert);
        });
      } else {
        offlineAlerts.forEach(alert => {
          this.alerts.set(alert.id, alert);
        });
      }

      // Limpiar alertas viejas (más de 30 días)
      await this.cleanOldAlerts();
    } catch (error) {
      console.error('Error cargando alertas:', error);
    }
  }

  async checkProductAlerts(product: Product): Promise<StockAlert[]> {
    const newAlerts: StockAlert[] = [];

    // Verificar stock bajo
    if (product.stock <= product.minStock && product.stock > 0) {
      const lowStockAlert = await this.createOrUpdateAlert(
        product.id,
        'low_stock',
        product.minStock,
        product.stock,
        `Stock bajo: ${product.name} tiene solo ${product.stock} unidades (mínimo: ${product.minStock})`
      );
      if (lowStockAlert) {
        newAlerts.push(lowStockAlert);
      }
    }

    // Verificar stock agotado
    if (product.stock === 0) {
      const outOfStockAlert = await this.createOrUpdateAlert(
        product.id,
        'out_of_stock',
        0,
        0,
        `Sin stock: ${product.name} está agotado`
      );
      if (outOfStockAlert) {
        newAlerts.push(outOfStockAlert);
      }
    }

    // Si el stock está bien, desactivar alertas existentes
    if (product.stock > product.minStock) {
      await this.deactivateProductAlerts(product.id);
    }

    return newAlerts;
  }

  async checkAllAlerts(): Promise<StockAlert[]> {
    try {
      // Obtener todos los productos desde offline storage
      const products = await offlineStorage.getAll<Product>('products');
      const newAlerts: StockAlert[] = [];

      for (const product of products) {
        if (product.active) {
          const productAlerts = await this.checkProductAlerts(product);
          newAlerts.push(...productAlerts);
        }
      }

      console.log(`Verificación de alertas completada: ${newAlerts.length} nuevas alertas`);
      return newAlerts;
    } catch (error) {
      console.error('Error verificando alertas:', error);
      return [];
    }
  }

  async getActiveAlerts(): Promise<StockAlert[]> {
    return Array.from(this.alerts.values())
      .filter(alert => alert.active)
      .sort((a, b) => {
        // Priorizar por tipo: out_of_stock > low_stock > expired
        const typePriority = { out_of_stock: 3, low_stock: 2, expired: 1 };
        const aPriority = typePriority[a.type] || 0;
        const bPriority = typePriority[b.type] || 0;
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }
        
        // Luego por fecha (más recientes primero)
        return b.created.getTime() - a.created.getTime();
      });
  }

  async getAlertsByProduct(productId: string): Promise<StockAlert[]> {
    return Array.from(this.alerts.values())
      .filter(alert => alert.productId === productId)
      .sort((a, b) => b.created.getTime() - a.created.getTime());
  }

  async getAlertsByType(type: StockAlert['type']): Promise<StockAlert[]> {
    return Array.from(this.alerts.values())
      .filter(alert => alert.type === type && alert.active)
      .sort((a, b) => b.created.getTime() - a.created.getTime());
  }

  async dismissAlert(alertId: string): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    const updatedAlert: StockAlert = {
      ...alert,
      active: false
    };

    this.alerts.set(alertId, updatedAlert);
    
    await this.saveAlert(updatedAlert);
    await this.saveAlertsToStorage();

    console.log(`Alerta ${alertId} desactivada`);
    return true;
  }

  async dismissProductAlerts(productId: string): Promise<number> {
    const productAlerts = await this.getAlertsByProduct(productId);
    let dismissedCount = 0;

    for (const alert of productAlerts) {
      if (alert.active) {
        await this.dismissAlert(alert.id);
        dismissedCount++;
      }
    }

    return dismissedCount;
  }

  async getAlertsStats(): Promise<{
    total: number;
    active: number;
    lowStock: number;
    outOfStock: number;
    expired: number;
  }> {
    const alerts = Array.from(this.alerts.values());
    const active = alerts.filter(a => a.active);

    return {
      total: alerts.length,
      active: active.length,
      lowStock: active.filter(a => a.type === 'low_stock').length,
      outOfStock: active.filter(a => a.type === 'out_of_stock').length,
      expired: active.filter(a => a.type === 'expired').length
    };
  }

  private async createOrUpdateAlert(
    productId: string,
    type: StockAlert['type'],
    threshold: number,
    currentStock: number,
    message: string
  ): Promise<StockAlert | null> {
    // Buscar alerta existente del mismo tipo para el mismo producto
    const existingAlert = Array.from(this.alerts.values())
      .find(alert => alert.productId === productId && alert.type === type && alert.active);

    if (existingAlert) {
      // Actualizar alerta existente si los valores han cambiado
      if (existingAlert.currentStock !== currentStock) {
        const updatedAlert: StockAlert = {
          ...existingAlert,
          currentStock,
          message,
          created: new Date() // Actualizar timestamp
        };

        this.alerts.set(existingAlert.id, updatedAlert);
        await this.saveAlert(updatedAlert);
        await this.saveAlertsToStorage();

        return updatedAlert;
      }
      return null; // No hay cambios
    }

    // Crear nueva alerta
    const newAlert: StockAlert = {
      id: this.generateAlertId(),
      productId,
      type,
      threshold,
      currentStock,
      message,
      active: true,
      created: new Date()
    };

    this.alerts.set(newAlert.id, newAlert);
    
    await this.saveAlert(newAlert);
    await this.saveAlertsToStorage();

    // Emitir evento
    this.emitAlertEvent(newAlert);

    console.log(`Nueva alerta creada: ${message}`);
    return newAlert;
  }

  private async deactivateProductAlerts(productId: string): Promise<void> {
    const productAlerts = Array.from(this.alerts.values())
      .filter(alert => alert.productId === productId && alert.active);

    for (const alert of productAlerts) {
      await this.dismissAlert(alert.id);
    }
  }

  private emitAlertEvent(alert: StockAlert): void {
    switch (alert.type) {
      case 'low_stock':
        EventBus.emit(InventoryEvents.STOCK_LOW, { alert });
        break;
      case 'out_of_stock':
        EventBus.emit(InventoryEvents.STOCK_OUT, { alert });
        break;
    }
  }

  private startAlertsMonitoring(): void {
    // Verificar alertas cada 5 minutos
    this.alertsCheckInterval = setInterval(() => {
      this.checkAllAlerts();
    }, 5 * 60 * 1000);
  }

  private stopAlertsMonitoring(): void {
    if (this.alertsCheckInterval) {
      clearInterval(this.alertsCheckInterval);
      this.alertsCheckInterval = null;
    }
  }

  private async cleanOldAlerts(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const oldAlerts = Array.from(this.alerts.values())
      .filter(alert => !alert.active && alert.created < thirtyDaysAgo);

    for (const alert of oldAlerts) {
      this.alerts.delete(alert.id);
      await offlineStorage.delete('alerts', alert.id);
    }

    if (oldAlerts.length > 0) {
      console.log(`Eliminadas ${oldAlerts.length} alertas antiguas`);
      await this.saveAlertsToStorage();
    }
  }

  private async saveAlert(alert: StockAlert): Promise<void> {
    try {
      // Guardar en offline storage
      await offlineStorage.set('alerts', alert.id, alert, false);
      
      // Agregar a cola de sincronización si está offline
      if (!navigator.onLine) {
        await offlineStorage.addToSyncQueue('update', 'alerts', alert, alert.id);
      }
    } catch (error) {
      console.error('Error guardando alerta:', error);
    }
  }

  private async saveAlertsToStorage(): Promise<void> {
    try {
      const alertsArray = Array.from(this.alerts.values());
      this.storage.save('alerts', alertsArray);
    } catch (error) {
      console.error('Error guardando alertas en localStorage:', error);
    }
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}