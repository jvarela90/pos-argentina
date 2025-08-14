import { 
  BaseModule, 
  ModuleConfig, 
  SystemEvents, 
  Sale, 
  SaleItem, 
  PaymentData, 
  PaymentResult,
  Product,
  generateId,
  formatCurrency
} from '@pos-argentina/shared';

import { CartManager } from './services/cart-manager';
import { PaymentProcessor } from './services/payment-processor';
import { ReceiptPrinter } from './services/receipt-printer';

/**
 * Módulo POS-Core - Funcionalidad base del sistema de ventas
 * Implementa las operaciones esenciales: venta, pago, impresión
 */
export class POSCoreModule extends BaseModule {
  private cartManager: CartManager;
  private paymentProcessor: PaymentProcessor;
  private receiptPrinter: ReceiptPrinter;
  private currentSale: Sale | null = null;

  constructor() {
    super({
      id: 'pos-core',
      name: 'POS Core',
      version: '1.0.0',
      dependencies: [], // No tiene dependencias - es el módulo base
      optional: false, // Siempre requerido
      price: 12000, // $12.000 ARS/mes
      trialDays: 30,
      description: 'Terminal de venta básica con carrito, pagos y tickets'
    });

    // Inicializar servicios
    this.cartManager = new CartManager(this.storage);
    this.paymentProcessor = new PaymentProcessor(this.eventBus);
    this.receiptPrinter = new ReceiptPrinter();

    console.log('🏪 POS Core Module initialized');
  }

  /**
   * Instala el módulo POS-Core
   */
  async install(): Promise<boolean> {
    try {
      console.log('📦 Installing POS Core module...');

      // Configurar eventos internos
      this.setupEventHandlers();
      
      // Inicializar almacenamiento local
      await this.initializeStorage();
      
      // Cargar configuración guardada
      await this.loadConfiguration();

      this.emit(SystemEvents.MODULE_INSTALLED, { 
        moduleId: this.config.id,
        timestamp: new Date()
      });

      console.log('✅ POS Core module installed successfully');
      return true;
    } catch (error) {
      console.error('❌ POS Core installation failed:', error);
      return false;
    }
  }

  /**
   * Desinstala el módulo
   */
  async uninstall(): Promise<boolean> {
    try {
      console.log('🗑️ Uninstalling POS Core module...');
      
      // Guardar datos antes de desinstalar
      await this.saveCurrentState();
      
      // Limpiar eventos
      this.eventBus.removeAllListeners(`${this.config.id}:*`);
      
      this.emit(SystemEvents.MODULE_UNINSTALLED, { 
        moduleId: this.config.id,
        timestamp: new Date()
      });

      console.log('✅ POS Core module uninstalled successfully');
      return true;
    } catch (error) {
      console.error('❌ POS Core uninstall failed:', error);
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
   * Inicia una nueva venta
   */
  startNewSale(): string {
    const saleId = generateId();
    
    this.currentSale = {
      id: saleId,
      items: [],
      subtotal: 0,
      tax: 0,
      discount: 0,
      total: 0,
      paymentMethod: 'cash',
      timestamp: new Date(),
      status: 'pending'
    };

    // Limpiar carrito anterior
    this.cartManager.clear();

    this.emit(SystemEvents.SALE_STARTED, { 
      saleId,
      timestamp: new Date()
    });

    console.log(`🛒 New sale started: ${saleId}`);
    return saleId;
  }

  /**
   * Agrega un producto al carrito
   */
  addProductToCart(product: Product, quantity: number = 1): boolean {
    try {
      const saleItem: SaleItem = {
        id: generateId(),
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity,
        tax: product.tax || 21, // IVA estándar Argentina
        discount: 0,
        category: product.category,
        barcode: product.barcode
      };

      const success = this.cartManager.addItem(saleItem);
      
      if (success) {
        this.updateCurrentSaleTotals();
        
        this.emit(SystemEvents.ITEM_ADDED, {
          saleId: this.currentSale?.id,
          item: saleItem,
          cartTotal: this.cartManager.getTotal()
        });

        console.log(`➕ Product added to cart: ${product.name} x${quantity} = ${formatCurrency(saleItem.price * quantity)}`);
      }

      return success;
    } catch (error) {
      console.error('❌ Error adding product to cart:', error);
      return false;
    }
  }

  /**
   * Remueve un producto del carrito
   */
  removeProductFromCart(itemId: string): boolean {
    try {
      const removedItem = this.cartManager.getItem(itemId);
      const success = this.cartManager.removeItem(itemId);
      
      if (success && removedItem) {
        this.updateCurrentSaleTotals();
        
        this.emit(SystemEvents.ITEM_REMOVED, {
          saleId: this.currentSale?.id,
          itemId,
          item: removedItem,
          cartTotal: this.cartManager.getTotal()
        });

        console.log(`➖ Product removed from cart: ${removedItem.name}`);
      }

      return success;
    } catch (error) {
      console.error('❌ Error removing product from cart:', error);
      return false;
    }
  }

  /**
   * Actualiza la cantidad de un producto
   */
  updateProductQuantity(itemId: string, newQuantity: number): boolean {
    try {
      const success = this.cartManager.updateItemQuantity(itemId, newQuantity);
      
      if (success) {
        this.updateCurrentSaleTotals();
        
        const item = this.cartManager.getItem(itemId);
        this.emit(SystemEvents.ITEM_ADDED, { // Reusar evento de agregado
          saleId: this.currentSale?.id,
          item,
          cartTotal: this.cartManager.getTotal()
        });

        console.log(`🔄 Product quantity updated: ${item?.name} -> ${newQuantity}`);
      }

      return success;
    } catch (error) {
      console.error('❌ Error updating product quantity:', error);
      return false;
    }
  }

  /**
   * Aplica descuento a la venta
   */
  applyDiscount(amount: number, isPercentage: boolean = false): boolean {
    try {
      const discount = isPercentage 
        ? this.cartManager.getSubtotal() * (amount / 100)
        : amount;

      this.cartManager.setDiscount(discount);
      this.updateCurrentSaleTotals();

      console.log(`💰 Discount applied: ${formatCurrency(discount)}`);
      return true;
    } catch (error) {
      console.error('❌ Error applying discount:', error);
      return false;
    }
  }

  /**
   * Procesa el pago y completa la venta
   */
  async processPayment(paymentData: PaymentData): Promise<PaymentResult> {
    try {
      if (!this.currentSale) {
        throw new Error('No active sale to process payment');
      }

      if (this.cartManager.isEmpty()) {
        throw new Error('Cannot process payment for empty cart');
      }

      this.emit(SystemEvents.PAYMENT_STARTED, {
        saleId: this.currentSale.id,
        paymentData
      });

      console.log(`💳 Processing payment: ${paymentData.method} - ${formatCurrency(paymentData.amount)}`);

      // Procesar pago a través del servicio
      const paymentResult = await this.paymentProcessor.processPayment(paymentData);

      if (paymentResult.success) {
        // Completar la venta
        await this.completeSale(paymentData, paymentResult);
        
        this.emit(SystemEvents.PAYMENT_COMPLETED, {
          saleId: this.currentSale.id,
          paymentResult
        });
      } else {
        this.emit(SystemEvents.PAYMENT_FAILED, {
          saleId: this.currentSale.id,
          error: paymentResult.error
        });
      }

      return paymentResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown payment error';
      console.error('❌ Payment processing failed:', errorMessage);
      
      this.emit(SystemEvents.PAYMENT_FAILED, {
        saleId: this.currentSale?.id,
        error: errorMessage
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Obtiene el estado actual del carrito
   */
  getCartState() {
    return {
      items: this.cartManager.getItems(),
      itemCount: this.cartManager.getItemCount(),
      subtotal: this.cartManager.getSubtotal(),
      tax: this.cartManager.getTax(),
      discount: this.cartManager.getDiscount(),
      total: this.cartManager.getTotal(),
      isEmpty: this.cartManager.isEmpty()
    };
  }

  /**
   * Obtiene la venta actual
   */
  getCurrentSale(): Sale | null {
    return this.currentSale ? { ...this.currentSale } : null;
  }

  /**
   * Cancela la venta actual
   */
  cancelCurrentSale(): void {
    if (this.currentSale) {
      this.emit(SystemEvents.SALE_CANCELLED, {
        saleId: this.currentSale.id,
        timestamp: new Date()
      });

      console.log(`❌ Sale cancelled: ${this.currentSale.id}`);
      
      this.currentSale = null;
      this.cartManager.clear();
    }
  }

  // ===========================================
  // MÉTODOS PRIVADOS
  // ===========================================

  private setupEventHandlers(): void {
    // Escuchar eventos de otros módulos si es necesario
    this.subscribeToAll((event) => {
      // Log de todos los eventos para debugging en desarrollo
      if (process.env.NODE_ENV === 'development') {
        console.log(`📡 Event received in POS Core:`, event);
      }
    });
  }

  private async initializeStorage(): Promise<void> {
    // Crear estructuras de datos básicas si no existen
    if (!this.storage.exists('sales_history')) {
      this.storage.save('sales_history', []);
    }

    if (!this.storage.exists('config')) {
      this.storage.save('config', {
        defaultTaxRate: 21,
        defaultPaymentMethod: 'cash',
        autoprint: true,
        currency: 'ARS'
      });
    }
  }

  private async loadConfiguration(): Promise<void> {
    const config = this.storage.load('config');
    if (config) {
      console.log('📋 Configuration loaded:', config);
    }
  }

  private updateCurrentSaleTotals(): void {
    if (this.currentSale) {
      this.currentSale.items = this.cartManager.getItems();
      this.currentSale.subtotal = this.cartManager.getSubtotal();
      this.currentSale.tax = this.cartManager.getTax();
      this.currentSale.discount = this.cartManager.getDiscount();
      this.currentSale.total = this.cartManager.getTotal();
    }
  }

  private async completeSale(paymentData: PaymentData, paymentResult: PaymentResult): Promise<void> {
    if (!this.currentSale) return;

    // Actualizar datos de la venta
    this.currentSale.paymentMethod = paymentData.method;
    this.currentSale.status = 'completed';
    this.currentSale.receiptNumber = generateId();

    // Guardar en historial
    const salesHistory = this.storage.load<Sale[]>('sales_history') || [];
    salesHistory.push({ ...this.currentSale });
    this.storage.save('sales_history', salesHistory);

    // Imprimir ticket si está habilitado
    const config = this.storage.load('config');
    if (config?.autoprint) {
      await this.receiptPrinter.printSale(this.currentSale, paymentResult);
    }

    this.emit(SystemEvents.SALE_COMPLETED, {
      sale: this.currentSale,
      paymentResult
    });

    console.log(`✅ Sale completed: ${this.currentSale.id} - Total: ${formatCurrency(this.currentSale.total)}`);

    // Limpiar venta actual
    this.currentSale = null;
    this.cartManager.clear();
  }

  private async saveCurrentState(): Promise<void> {
    if (this.currentSale) {
      this.storage.save('current_sale_backup', this.currentSale);
    }
    
    const cartState = this.getCartState();
    this.storage.save('cart_backup', cartState);
  }

  /**
   * Recuperar estado después de reinstalación o reinicio
   */
  async restorePreviousState(): Promise<boolean> {
    try {
      const saleBackup = this.storage.load<Sale>('current_sale_backup');
      const cartBackup = this.storage.load('cart_backup');

      if (saleBackup && cartBackup) {
        this.currentSale = saleBackup;
        
        // Restaurar items del carrito
        if (cartBackup.items) {
          cartBackup.items.forEach((item: SaleItem) => {
            this.cartManager.addItem(item);
          });
        }

        console.log('🔄 Previous state restored successfully');
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Error restoring previous state:', error);
      return false;
    }
  }

  /**
   * Obtiene estadísticas básicas de ventas
   */
  getSalesStats(days: number = 30) {
    const salesHistory = this.storage.load<Sale[]>('sales_history') || [];
    const since = new Date();
    since.setDate(since.getDate() - days);

    const recentSales = salesHistory.filter(sale => 
      sale.timestamp >= since && sale.status === 'completed'
    );

    const totalSales = recentSales.length;
    const totalAmount = recentSales.reduce((sum, sale) => sum + sale.total, 0);
    const averageSale = totalSales > 0 ? totalAmount / totalSales : 0;

    return {
      totalSales,
      totalAmount,
      averageSale,
      period: days
    };
  }
}