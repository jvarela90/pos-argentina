import { EventEmitter } from 'eventemitter3';
import { DomainEvent } from '../types';
import { v4 as uuid } from 'uuid';

/**
 * Event Bus centralizado para comunicación entre módulos
 * Implementa patrón Observer para desacoplamiento total
 */
export class EventBus extends EventEmitter {
  private static instance: EventBus;
  private eventHistory: DomainEvent[] = [];

  private constructor() {
    super();
  }

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * Emite un evento de dominio con metadata
   */
  emitEvent(type: string, moduleId: string, data: any): void {
    const event: DomainEvent = {
      id: uuid(),
      type,
      moduleId,
      data,
      timestamp: new Date(),
      version: 1
    };

    // Guardar en historial
    this.eventHistory.push(event);

    // Emitir evento con namespace del módulo
    this.emit(`${moduleId}:${type}`, event);
    
    // Emitir evento global
    this.emit('*', event);

    console.log(`📡 Event emitted: ${moduleId}:${type}`, data);
  }

  /**
   * Suscribirse a eventos de un módulo específico
   */
  subscribe(moduleId: string, eventType: string, handler: (event: DomainEvent) => void): void {
    this.on(`${moduleId}:${eventType}`, handler);
  }

  /**
   * Suscribirse a todos los eventos
   */
  subscribeToAll(handler: (event: DomainEvent) => void): void {
    this.on('*', handler);
  }

  /**
   * Desuscribirse de eventos
   */
  unsubscribe(moduleId: string, eventType: string, handler: (event: DomainEvent) => void): void {
    this.off(`${moduleId}:${eventType}`, handler);
  }

  /**
   * Obtener historial de eventos (útil para debugging)
   */
  getEventHistory(moduleId?: string, since?: Date): DomainEvent[] {
    let events = this.eventHistory;

    if (moduleId) {
      events = events.filter(e => e.moduleId === moduleId);
    }

    if (since) {
      events = events.filter(e => e.timestamp >= since);
    }

    return events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Limpiar historial de eventos (por performance)
   */
  clearHistory(): void {
    this.eventHistory = [];
  }
}

// Eventos estándar del sistema
export const SystemEvents = {
  // Módulos
  MODULE_INSTALLED: 'module.installed',
  MODULE_UNINSTALLED: 'module.uninstalled',
  MODULE_ACTIVATED: 'module.activated',
  MODULE_DEACTIVATED: 'module.deactivated',

  // Ventas
  SALE_STARTED: 'sale.started',
  SALE_COMPLETED: 'sale.completed',
  SALE_CANCELLED: 'sale.cancelled',
  ITEM_ADDED: 'sale.item.added',
  ITEM_REMOVED: 'sale.item.removed',

  // Pagos
  PAYMENT_STARTED: 'payment.started',
  PAYMENT_COMPLETED: 'payment.completed',
  PAYMENT_FAILED: 'payment.failed',

  // Inventario
  PRODUCT_ADDED: 'inventory.product.added',
  PRODUCT_UPDATED: 'inventory.product.updated',
  STOCK_UPDATED: 'inventory.stock.updated',
  LOW_STOCK_ALERT: 'inventory.low_stock_alert',

  // Clientes
  CUSTOMER_ADDED: 'customers.customer.added',
  CUSTOMER_UPDATED: 'customers.customer.updated',
  CREDIT_ADDED: 'customers.credit.added',
  PAYMENT_RECEIVED: 'customers.payment.received',

  // Sistema
  SYNC_STARTED: 'system.sync.started',
  SYNC_COMPLETED: 'system.sync.completed',
  ERROR: 'system.error'
} as const;