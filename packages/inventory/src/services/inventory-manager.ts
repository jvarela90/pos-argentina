import { Product, StorageManager, offlineStorage } from '@pos-argentina/shared';

export class InventoryManager {
  private storage: StorageManager;
  private products: Map<string, Product> = new Map();

  constructor() {
    this.storage = new StorageManager('inventory');
  }

  async initialize(): Promise<void> {
    console.log('Inicializando gestor de inventario...');
    await this.loadProducts();
  }

  async activate(): Promise<void> {
    await this.loadProducts();
    console.log(`Inventario activado con ${this.products.size} productos`);
  }

  async deactivate(): Promise<void> {
    console.log('Inventario desactivado');
  }

  async cleanup(): Promise<void> {
    this.products.clear();
    console.log('Inventario limpiado');
  }

  private async loadProducts(): Promise<void> {
    try {
      // Cargar desde offline storage primero
      const offlineProducts = await offlineStorage.getAll<Product>('products');
      
      // Si no hay productos offline, cargar desde localStorage
      if (offlineProducts.length === 0) {
        const localProducts = this.storage.load<Product[]>('products') || [];
        
        // Migrar a offline storage
        for (const product of localProducts) {
          await offlineStorage.set('products', product.id, product, true);
        }
        
        localProducts.forEach(product => {
          this.products.set(product.id, product);
        });
      } else {
        offlineProducts.forEach(product => {
          this.products.set(product.id, product);
        });
      }

      // Si no hay productos, crear productos de ejemplo
      if (this.products.size === 0) {
        await this.createSampleProducts();
      }
    } catch (error) {
      console.error('Error cargando productos:', error);
      await this.createSampleProducts();
    }
  }

  private async createSampleProducts(): Promise<void> {
    const sampleProducts: Omit<Product, 'id' | 'created' | 'updated'>[] = [
      {
        name: 'Pan Lactal',
        price: 850,
        category: 'Panadería',
        barcode: '7790001234567',
        stock: 25,
        minStock: 5,
        tax: 21,
        active: true
      },
      {
        name: 'Leche Entera 1L',
        price: 900,
        category: 'Lácteos',
        barcode: '7790002345678',
        stock: 30,
        minStock: 10,
        tax: 21,
        active: true
      },
      {
        name: 'Coca Cola 500ml',
        price: 650,
        category: 'Bebidas',
        barcode: '7790003456789',
        stock: 50,
        minStock: 15,
        tax: 21,
        active: true
      },
      {
        name: 'Arroz 1kg',
        price: 1200,
        category: 'Almacén',
        barcode: '7790004567890',
        stock: 20,
        minStock: 8,
        tax: 21,
        active: true
      },
      {
        name: 'Aceite Girasol 900ml',
        price: 1800,
        category: 'Almacén',
        barcode: '7790005678901',
        stock: 15,
        minStock: 5,
        tax: 21,
        active: true
      },
      {
        name: 'Yerba Mate 1kg',
        price: 2100,
        category: 'Almacén',
        barcode: '7790006789012',
        stock: 12,
        minStock: 3,
        tax: 21,
        active: true
      },
      {
        name: 'Papel Higiénico x4',
        price: 1500,
        category: 'Limpieza',
        barcode: '7790007890123',
        stock: 8,
        minStock: 5,
        tax: 21,
        active: true
      },
      {
        name: 'Detergente 750ml',
        price: 980,
        category: 'Limpieza',
        barcode: '7790008901234',
        stock: 18,
        minStock: 6,
        tax: 21,
        active: true
      }
    ];

    for (const productData of sampleProducts) {
      await this.addProduct(productData);
    }

    console.log(`Creados ${sampleProducts.length} productos de ejemplo`);
  }

  async addProduct(productData: Omit<Product, 'id' | 'created' | 'updated'>): Promise<Product> {
    const product: Product = {
      ...productData,
      id: this.generateProductId(),
      created: new Date(),
      updated: new Date()
    };

    this.products.set(product.id, product);
    
    await this.saveProduct(product);
    await this.saveProductsToStorage();

    return product;
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
    const product = this.products.get(id);
    if (!product) return null;

    const updatedProduct: Product = {
      ...product,
      ...updates,
      id: product.id, // Asegurar que no se cambie el ID
      created: product.created, // Mantener fecha de creación
      updated: new Date()
    };

    this.products.set(id, updatedProduct);
    
    await this.saveProduct(updatedProduct);
    await this.saveProductsToStorage();

    return updatedProduct;
  }

  async deleteProduct(id: string): Promise<boolean> {
    if (!this.products.has(id)) return false;

    this.products.delete(id);
    
    await offlineStorage.delete('products', id);
    await this.saveProductsToStorage();

    return true;
  }

  async getProduct(id: string): Promise<Product | null> {
    return this.products.get(id) || null;
  }

  async getAllProducts(): Promise<Product[]> {
    return Array.from(this.products.values())
      .filter(product => product.active)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    return Array.from(this.products.values())
      .filter(product => product.active && product.category === category)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async searchProducts(query: string): Promise<Product[]> {
    const searchTerm = query.toLowerCase().trim();
    
    return Array.from(this.products.values())
      .filter(product => 
        product.active && (
          product.name.toLowerCase().includes(searchTerm) ||
          product.category.toLowerCase().includes(searchTerm) ||
          (product.barcode && product.barcode.includes(searchTerm))
        )
      )
      .sort((a, b) => {
        // Priorizar coincidencias exactas en nombre
        const aNameMatch = a.name.toLowerCase().startsWith(searchTerm);
        const bNameMatch = b.name.toLowerCase().startsWith(searchTerm);
        
        if (aNameMatch && !bNameMatch) return -1;
        if (!aNameMatch && bNameMatch) return 1;
        
        return a.name.localeCompare(b.name);
      });
  }

  async getProductByBarcode(barcode: string): Promise<Product | null> {
    for (const product of this.products.values()) {
      if (product.barcode === barcode && product.active) {
        return product;
      }
    }
    return null;
  }

  async getLowStockProducts(): Promise<Product[]> {
    return Array.from(this.products.values())
      .filter(product => product.active && product.stock <= product.minStock)
      .sort((a, b) => a.stock - b.stock);
  }

  async getOutOfStockProducts(): Promise<Product[]> {
    return Array.from(this.products.values())
      .filter(product => product.active && product.stock === 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async updateStock(productId: string, newStock: number): Promise<boolean> {
    const product = this.products.get(productId);
    if (!product) return false;

    return (await this.updateProduct(productId, { stock: newStock })) !== null;
  }

  async adjustStock(productId: string, adjustment: number): Promise<boolean> {
    const product = this.products.get(productId);
    if (!product) return false;

    const newStock = Math.max(0, product.stock + adjustment);
    return await this.updateStock(productId, newStock);
  }

  async generateReport(): Promise<{
    totalProducts: number;
    totalValue: number;
    lowStockProducts: number;
    outOfStockProducts: number;
    categories: Record<string, number>;
  }> {
    const products = Array.from(this.products.values()).filter(p => p.active);
    
    const report = {
      totalProducts: products.length,
      totalValue: products.reduce((sum, p) => sum + (p.price * p.stock), 0),
      lowStockProducts: products.filter(p => p.stock <= p.minStock).length,
      outOfStockProducts: products.filter(p => p.stock === 0).length,
      categories: {} as Record<string, number>
    };

    // Contar productos por categoría
    products.forEach(product => {
      report.categories[product.category] = 
        (report.categories[product.category] || 0) + 1;
    });

    return report;
  }

  async getCategories(): Promise<string[]> {
    const categories = new Set<string>();
    
    this.products.forEach(product => {
      if (product.active) {
        categories.add(product.category);
      }
    });

    return Array.from(categories).sort();
  }

  private async saveProduct(product: Product): Promise<void> {
    try {
      // Guardar en offline storage
      await offlineStorage.set('products', product.id, product, false);
      
      // Agregar a cola de sincronización si está offline
      if (!navigator.onLine) {
        await offlineStorage.addToSyncQueue('update', 'products', product, product.id);
      }
    } catch (error) {
      console.error('Error guardando producto:', error);
    }
  }

  private async saveProductsToStorage(): Promise<void> {
    try {
      const productsArray = Array.from(this.products.values());
      this.storage.save('products', productsArray);
    } catch (error) {
      console.error('Error guardando productos en localStorage:', error);
    }
  }

  private generateProductId(): string {
    return `prod_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}