import { SaleItem, StorageManager, generateId, roundToCents } from '@pos-argentina/shared';

/**
 * Gestiona el carrito de compras con persistencia automática
 * Implementa lógica de negocio para items, totales e impuestos
 */
export class CartManager {
  private items: Map<string, SaleItem> = new Map();
  private discount: number = 0;
  private storage: StorageManager;

  constructor(storage: StorageManager) {
    this.storage = storage;
    this.loadFromStorage();
  }

  /**
   * Agrega un item al carrito
   */
  addItem(item: SaleItem): boolean {
    try {
      // Validar item
      if (!this.validateItem(item)) {
        throw new Error('Invalid item data');
      }

      // Si el producto ya existe, sumar cantidades
      const existingItem = this.findExistingItem(item);
      
      if (existingItem) {
        existingItem.quantity += item.quantity;
        this.items.set(existingItem.id, existingItem);
      } else {
        // Asegurar que tiene ID único
        if (!item.id) {
          item.id = generateId();
        }
        this.items.set(item.id, { ...item });
      }

      this.saveToStorage();
      console.log(`🛒 Item added to cart: ${item.name} x${item.quantity}`);
      return true;
    } catch (error) {
      console.error('❌ Error adding item to cart:', error);
      return false;
    }
  }

  /**
   * Remueve un item del carrito
   */
  removeItem(itemId: string): boolean {
    try {
      const deleted = this.items.delete(itemId);
      
      if (deleted) {
        this.saveToStorage();
        console.log(`🗑️ Item removed from cart: ${itemId}`);
      }

      return deleted;
    } catch (error) {
      console.error('❌ Error removing item from cart:', error);
      return false;
    }
  }

  /**
   * Actualiza la cantidad de un item
   */
  updateItemQuantity(itemId: string, newQuantity: number): boolean {
    try {
      if (newQuantity <= 0) {
        return this.removeItem(itemId);
      }

      const item = this.items.get(itemId);
      if (!item) {
        return false;
      }

      item.quantity = newQuantity;
      this.items.set(itemId, item);
      this.saveToStorage();

      console.log(`🔢 Item quantity updated: ${item.name} -> ${newQuantity}`);
      return true;
    } catch (error) {
      console.error('❌ Error updating item quantity:', error);
      return false;
    }
  }

  /**
   * Aplica descuento a un item específico
   */
  applyItemDiscount(itemId: string, discount: number): boolean {
    try {
      const item = this.items.get(itemId);
      if (!item) {
        return false;
      }

      item.discount = Math.max(0, discount);
      this.items.set(itemId, item);
      this.saveToStorage();

      console.log(`💰 Item discount applied: ${item.name} -> ${discount}`);
      return true;
    } catch (error) {
      console.error('❌ Error applying item discount:', error);
      return false;
    }
  }

  /**
   * Obtiene un item por ID
   */
  getItem(itemId: string): SaleItem | null {
    return this.items.get(itemId) || null;
  }

  /**
   * Obtiene todos los items
   */
  getItems(): SaleItem[] {
    return Array.from(this.items.values());
  }

  /**
   * Cuenta total de items (considerando cantidades)
   */
  getItemCount(): number {
    return Array.from(this.items.values())
      .reduce((count, item) => count + item.quantity, 0);
  }

  /**
   * Calcula subtotal (precio x cantidad - descuento por item)
   */
  getSubtotal(): number {
    const subtotal = Array.from(this.items.values())
      .reduce((sum, item) => {
        const itemTotal = (item.price * item.quantity) - item.discount;
        return sum + Math.max(0, itemTotal); // No permitir negativos
      }, 0);

    return roundToCents(subtotal);
  }

  /**
   * Calcula impuestos totales
   */
  getTax(): number {
    const tax = Array.from(this.items.values())
      .reduce((sum, item) => {
        const itemSubtotal = Math.max(0, (item.price * item.quantity) - item.discount);
        const itemTax = itemSubtotal * (item.tax / 100);
        return sum + itemTax;
      }, 0);

    return roundToCents(tax);
  }

  /**
   * Obtiene descuento total (descuentos por item + descuento general)
   */
  getDiscount(): number {
    const itemDiscounts = Array.from(this.items.values())
      .reduce((sum, item) => sum + item.discount, 0);

    return roundToCents(itemDiscounts + this.discount);
  }

  /**
   * Establece descuento general sobre el total
   */
  setDiscount(amount: number): void {
    this.discount = Math.max(0, amount);
    this.saveToStorage();
  }

  /**
   * Calcula total final
   */
  getTotal(): number {
    const subtotal = this.getSubtotal();
    const tax = this.getTax();
    const totalDiscount = this.discount; // Descuento general adicional
    
    const total = subtotal + tax - totalDiscount;
    return roundToCents(Math.max(0, total));
  }

  /**
   * Verifica si el carrito está vacío
   */
  isEmpty(): boolean {
    return this.items.size === 0;
  }

  /**
   * Limpia el carrito
   */
  clear(): void {
    this.items.clear();
    this.discount = 0;
    this.saveToStorage();
    console.log('🧹 Cart cleared');
  }

  /**
   * Obtiene resumen del carrito
   */
  getSummary() {
    return {
      itemCount: this.getItemCount(),
      subtotal: this.getSubtotal(),
      tax: this.getTax(),
      discount: this.getDiscount(),
      total: this.getTotal(),
      items: this.getItems().map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        total: (item.price * item.quantity) - item.discount,
        tax: item.tax,
        discount: item.discount
      }))
    };
  }

  /**
   * Clona el carrito actual
   */
  clone(): CartManager {
    const newCart = new CartManager(this.storage);
    
    this.items.forEach(item => {
      newCart.addItem({ ...item, id: generateId() }); // Nuevos IDs
    });
    
    newCart.setDiscount(this.discount);
    return newCart;
  }

  // ===========================================
  // MÉTODOS PRIVADOS
  // ===========================================

  private validateItem(item: SaleItem): boolean {
    if (!item.productId || !item.name || item.price < 0 || item.quantity <= 0) {
      return false;
    }

    if (item.tax < 0 || item.tax > 100) {
      return false;
    }

    if (item.discount < 0) {
      return false;
    }

    return true;
  }

  private findExistingItem(newItem: SaleItem): SaleItem | null {
    // Buscar item existente por productId
    for (const item of this.items.values()) {
      if (item.productId === newItem.productId && 
          item.price === newItem.price &&
          item.tax === newItem.tax) {
        return item;
      }
    }
    return null;
  }

  private saveToStorage(): void {
    try {
      const cartData = {
        items: Array.from(this.items.values()),
        discount: this.discount,
        timestamp: Date.now()
      };
      
      this.storage.save('current_cart', cartData);
    } catch (error) {
      console.error('❌ Error saving cart to storage:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const cartData = this.storage.load<{
        items: SaleItem[],
        discount: number,
        timestamp: number
      }>('current_cart');

      if (cartData) {
        // Verificar que los datos no sean muy antiguos (1 día)
        const maxAge = 24 * 60 * 60 * 1000; // 24 horas
        if (Date.now() - cartData.timestamp > maxAge) {
          console.log('🗑️ Old cart data found, clearing...');
          this.storage.remove('current_cart');
          return;
        }

        // Restaurar items
        cartData.items.forEach(item => {
          this.items.set(item.id, item);
        });

        // Restaurar descuento
        this.discount = cartData.discount || 0;

        console.log(`🔄 Cart loaded from storage: ${this.items.size} items`);
      }
    } catch (error) {
      console.error('❌ Error loading cart from storage:', error);
      // En caso de error, empezar con carrito limpio
      this.clear();
    }
  }
}