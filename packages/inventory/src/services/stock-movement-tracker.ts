import { StorageManager, offlineStorage } from '@pos-argentina/shared';
import { StockMovement } from '../inventory.module';

export class StockMovementTracker {
  private storage: StorageManager;
  private movements: Map<string, StockMovement> = new Map();

  constructor() {
    this.storage = new StorageManager('stock_movements');
  }

  async initialize(): Promise<void> {
    console.log('Inicializando tracker de movimientos de stock...');
    await this.loadMovements();
  }

  async activate(): Promise<void> {
    await this.loadMovements();
    console.log(`Tracker de stock activado con ${this.movements.size} movimientos`);
  }

  async deactivate(): Promise<void> {
    console.log('Tracker de stock desactivado');
  }

  async cleanup(): Promise<void> {
    this.movements.clear();
    console.log('Movimientos de stock limpiados');
  }

  private async loadMovements(): Promise<void> {
    try {
      // Cargar desde offline storage primero
      const offlineMovements = await offlineStorage.getAll<StockMovement>('stock_movements');
      
      // Si no hay movimientos offline, cargar desde localStorage
      if (offlineMovements.length === 0) {
        const localMovements = this.storage.load<StockMovement[]>('movements') || [];
        
        // Migrar a offline storage
        for (const movement of localMovements) {
          await offlineStorage.set('stock_movements', movement.id, movement, true);
        }
        
        localMovements.forEach(movement => {
          this.movements.set(movement.id, movement);
        });
      } else {
        offlineMovements.forEach(movement => {
          this.movements.set(movement.id, movement);
        });
      }

      // Limpiar movimientos antiguos (más de 6 meses)
      await this.cleanOldMovements();
    } catch (error) {
      console.error('Error cargando movimientos de stock:', error);
    }
  }

  async recordMovement(movementData: Omit<StockMovement, 'id' | 'date'>): Promise<StockMovement> {
    // Validar datos del movimiento
    this.validateMovementData(movementData);

    const movement: StockMovement = {
      ...movementData,
      id: this.generateMovementId(),
      date: new Date()
    };

    this.movements.set(movement.id, movement);
    
    await this.saveMovement(movement);
    await this.saveMovementsToStorage();

    console.log(`Movimiento registrado: ${movement.type} de ${movement.quantity} unidades para producto ${movement.productId}`);
    
    return movement;
  }

  async getMovement(id: string): Promise<StockMovement | null> {
    return this.movements.get(id) || null;
  }

  async getMovements(productId?: string, limit?: number): Promise<StockMovement[]> {
    let movements = Array.from(this.movements.values());

    // Filtrar por producto si se especifica
    if (productId) {
      movements = movements.filter(m => m.productId === productId);
    }

    // Ordenar por fecha (más recientes primero)
    movements.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Aplicar límite si se especifica
    if (limit && limit > 0) {
      movements = movements.slice(0, limit);
    }

    return movements;
  }

  async getMovementsByType(type: StockMovement['type'], limit?: number): Promise<StockMovement[]> {
    let movements = Array.from(this.movements.values())
      .filter(m => m.type === type);

    // Ordenar por fecha (más recientes primero)
    movements.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Aplicar límite si se especifica
    if (limit && limit > 0) {
      movements = movements.slice(0, limit);
    }

    return movements;
  }

  async getMovementsByDateRange(startDate: Date, endDate: Date, productId?: string): Promise<StockMovement[]> {
    let movements = Array.from(this.movements.values())
      .filter(m => m.date >= startDate && m.date <= endDate);

    // Filtrar por producto si se especifica
    if (productId) {
      movements = movements.filter(m => m.productId === productId);
    }

    // Ordenar por fecha (más recientes primero)
    movements.sort((a, b) => b.date.getTime() - a.date.getTime());

    return movements;
  }

  async getMovementsByUser(userId: string, limit?: number): Promise<StockMovement[]> {
    let movements = Array.from(this.movements.values())
      .filter(m => m.userId === userId);

    // Ordenar por fecha (más recientes primero)
    movements.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Aplicar límite si se especifica
    if (limit && limit > 0) {
      movements = movements.slice(0, limit);
    }

    return movements;
  }

  async getStockSummary(productId: string): Promise<{
    currentStock: number;
    totalEntradas: number;
    totalSalidas: number;
    totalAjustes: number;
    lastMovement: StockMovement | null;
  }> {
    const productMovements = await this.getMovements(productId);
    
    let totalEntradas = 0;
    let totalSalidas = 0;
    let totalAjustes = 0;

    productMovements.forEach(movement => {
      switch (movement.type) {
        case 'entrada':
          totalEntradas += movement.quantity;
          break;
        case 'salida':
          totalSalidas += movement.quantity;
          break;
        case 'ajuste':
          totalAjustes += movement.quantity;
          break;
      }
    });

    // Calcular stock actual basado en movimientos
    const currentStock = totalEntradas - totalSalidas + totalAjustes;
    const lastMovement = productMovements.length > 0 ? productMovements[0] : null;

    return {
      currentStock: Math.max(0, currentStock),
      totalEntradas,
      totalSalidas,
      totalAjustes,
      lastMovement
    };
  }

  async generateMovementReport(startDate: Date, endDate: Date): Promise<{
    totalMovements: number;
    entradas: number;
    salidas: number;
    ajustes: number;
    productsSummary: Record<string, {
      productId: string;
      entradas: number;
      salidas: number;
      ajustes: number;
    }>;
  }> {
    const movements = await this.getMovementsByDateRange(startDate, endDate);
    
    const report = {
      totalMovements: movements.length,
      entradas: 0,
      salidas: 0,
      ajustes: 0,
      productsSummary: {} as Record<string, {
        productId: string;
        entradas: number;
        salidas: number;
        ajustes: number;
      }>
    };

    movements.forEach(movement => {
      // Contadores generales
      switch (movement.type) {
        case 'entrada':
          report.entradas++;
          break;
        case 'salida':
          report.salidas++;
          break;
        case 'ajuste':
          report.ajustes++;
          break;
      }

      // Resumen por producto
      if (!report.productsSummary[movement.productId]) {
        report.productsSummary[movement.productId] = {
          productId: movement.productId,
          entradas: 0,
          salidas: 0,
          ajustes: 0
        };
      }

      const productSummary = report.productsSummary[movement.productId];
      switch (movement.type) {
        case 'entrada':
          productSummary.entradas += movement.quantity;
          break;
        case 'salida':
          productSummary.salidas += movement.quantity;
          break;
        case 'ajuste':
          productSummary.ajustes += movement.quantity;
          break;
      }
    });

    return report;
  }

  async deleteMovement(id: string): Promise<boolean> {
    if (!this.movements.has(id)) return false;

    this.movements.delete(id);
    
    await offlineStorage.delete('stock_movements', id);
    await this.saveMovementsToStorage();

    return true;
  }

  private async cleanOldMovements(): Promise<void> {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const oldMovements = Array.from(this.movements.values())
      .filter(m => m.date < sixMonthsAgo);

    for (const movement of oldMovements) {
      await this.deleteMovement(movement.id);
    }

    if (oldMovements.length > 0) {
      console.log(`Eliminados ${oldMovements.length} movimientos antiguos`);
    }
  }

  private validateMovementData(data: Omit<StockMovement, 'id' | 'date'>): void {
    if (!data.productId || data.productId.trim() === '') {
      throw new Error('ID de producto es requerido');
    }

    if (!data.type || !['entrada', 'salida', 'ajuste'].includes(data.type)) {
      throw new Error('Tipo de movimiento inválido');
    }

    if (typeof data.quantity !== 'number' || data.quantity <= 0) {
      throw new Error('Cantidad debe ser un número positivo');
    }

    if (!data.reason || data.reason.trim() === '') {
      throw new Error('Razón del movimiento es requerida');
    }

    if (!data.userId || data.userId.trim() === '') {
      throw new Error('ID de usuario es requerido');
    }

    if (data.cost !== undefined && (typeof data.cost !== 'number' || data.cost < 0)) {
      throw new Error('Costo debe ser un número no negativo');
    }
  }

  private async saveMovement(movement: StockMovement): Promise<void> {
    try {
      // Guardar en offline storage
      await offlineStorage.set('stock_movements', movement.id, movement, false);
      
      // Agregar a cola de sincronización si está offline
      if (!navigator.onLine) {
        await offlineStorage.addToSyncQueue('create', 'stock_movements', movement, movement.id);
      }
    } catch (error) {
      console.error('Error guardando movimiento:', error);
    }
  }

  private async saveMovementsToStorage(): Promise<void> {
    try {
      const movementsArray = Array.from(this.movements.values());
      this.storage.save('movements', movementsArray);
    } catch (error) {
      console.error('Error guardando movimientos en localStorage:', error);
    }
  }

  private generateMovementId(): string {
    return `mov_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}