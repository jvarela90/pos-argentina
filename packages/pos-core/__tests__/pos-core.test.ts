import { POSCoreModule } from '../src/pos-core.module';
import { Product } from '@pos-argentina/shared';

// Mock de productos para testing
const mockProduct: Product = {
  id: 'test-product-1',
  name: 'Pan de Molde',
  price: 850,
  category: 'Panadería',
  barcode: '123456789',
  stock: 50,
  minStock: 10,
  tax: 21,
  active: true,
  created: new Date(),
  updated: new Date()
};

describe('POSCoreModule', () => {
  let posCore: POSCoreModule;

  beforeEach(async () => {
    posCore = new POSCoreModule();
    await posCore.activate();
  });

  afterEach(() => {
    if (posCore) {
      posCore.destroy();
    }
  });

  describe('Module Lifecycle', () => {
    it('should initialize correctly', () => {
      expect(posCore.getId()).toBe('pos-core');
      expect(posCore.getName()).toBe('POS Core');
      expect(posCore.getVersion()).toBe('1.0.0');
      expect(posCore.isModuleActive()).toBe(true);
    });

    it('should install and uninstall correctly', async () => {
      const newModule = new POSCoreModule();
      
      const installResult = await newModule.install();
      expect(installResult).toBe(true);
      expect(newModule.isModuleInstalled()).toBe(true);
      
      const uninstallResult = await newModule.uninstall();
      expect(uninstallResult).toBe(true);
    });
  });

  describe('Sales Operations', () => {
    it('should start a new sale', () => {
      const saleId = posCore.startNewSale();
      
      expect(saleId).toBeDefined();
      expect(typeof saleId).toBe('string');
      
      const currentSale = posCore.getCurrentSale();
      expect(currentSale).toBeTruthy();
      expect(currentSale?.id).toBe(saleId);
      expect(currentSale?.status).toBe('pending');
    });

    it('should add products to cart', () => {
      posCore.startNewSale();
      
      const result = posCore.addProductToCart(mockProduct, 2);
      expect(result).toBe(true);
      
      const cartState = posCore.getCartState();
      expect(cartState.items).toHaveLength(1);
      expect(cartState.items[0].name).toBe(mockProduct.name);
      expect(cartState.items[0].quantity).toBe(2);
      expect(cartState.itemCount).toBe(2);
      expect(cartState.total).toBeGreaterThan(0);
    });

    it('should calculate totals correctly', () => {
      posCore.startNewSale();
      posCore.addProductToCart(mockProduct, 1);
      
      const cartState = posCore.getCartState();
      const expectedSubtotal = mockProduct.price;
      const expectedTax = expectedSubtotal * (mockProduct.tax / 100);
      const expectedTotal = expectedSubtotal + expectedTax;
      
      expect(cartState.subtotal).toBe(expectedSubtotal);
      expect(cartState.tax).toBeCloseTo(expectedTax, 2);
      expect(cartState.total).toBeCloseTo(expectedTotal, 2);
    });

    it('should remove products from cart', () => {
      posCore.startNewSale();
      posCore.addProductToCart(mockProduct, 1);
      
      let cartState = posCore.getCartState();
      const itemId = cartState.items[0].id;
      
      const result = posCore.removeProductFromCart(itemId);
      expect(result).toBe(true);
      
      cartState = posCore.getCartState();
      expect(cartState.items).toHaveLength(0);
      expect(cartState.total).toBe(0);
    });

    it('should apply discounts correctly', () => {
      posCore.startNewSale();
      posCore.addProductToCart(mockProduct, 1);
      
      const discountAmount = 100;
      const result = posCore.applyDiscount(discountAmount);
      expect(result).toBe(true);
      
      const cartState = posCore.getCartState();
      expect(cartState.discount).toBe(discountAmount);
      expect(cartState.total).toBeLessThan(mockProduct.price * 1.21);
    });
  });

  describe('Payment Processing', () => {
    beforeEach(() => {
      posCore.startNewSale();
      posCore.addProductToCart(mockProduct, 1);
    });

    it('should process cash payment successfully', async () => {
      const cartState = posCore.getCartState();
      const paymentAmount = cartState.total + 100; // Con vuelto
      
      const result = await posCore.processPayment({
        method: 'cash',
        amount: paymentAmount
      });
      
      expect(result.success).toBe(true);
      expect(result.change).toBe(100);
      
      // El carrito debería estar vacío después del pago
      const newCartState = posCore.getCartState();
      expect(newCartState.isEmpty).toBe(true);
    });

    it('should fail payment with insufficient amount', async () => {
      const cartState = posCore.getCartState();
      const insufficientAmount = cartState.total - 100;
      
      const result = await posCore.processPayment({
        method: 'cash',
        amount: insufficientAmount
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('insuficiente');
    });

    it('should fail payment with empty cart', async () => {
      posCore.cancelCurrentSale(); // Limpia el carrito
      
      const result = await posCore.processPayment({
        method: 'cash',
        amount: 1000
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should process card payment', async () => {
      const cartState = posCore.getCartState();
      
      const result = await posCore.processPayment({
        method: 'credit_card',
        amount: cartState.total
      });
      
      // En el mock, el 95% de las transacciones son exitosas
      // Este test podría fallar ocasionalmente por el random
      if (result.success) {
        expect(result.authCode).toBeDefined();
      } else {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('Cart Management', () => {
    beforeEach(() => {
      posCore.startNewSale();
    });

    it('should handle multiple products', () => {
      const product2: Product = {
        ...mockProduct,
        id: 'test-product-2',
        name: 'Leche',
        price: 900
      };
      
      posCore.addProductToCart(mockProduct, 1);
      posCore.addProductToCart(product2, 2);
      
      const cartState = posCore.getCartState();
      expect(cartState.items).toHaveLength(2);
      expect(cartState.itemCount).toBe(3); // 1 + 2
    });

    it('should accumulate same products', () => {
      posCore.addProductToCart(mockProduct, 1);
      posCore.addProductToCart(mockProduct, 2);
      
      const cartState = posCore.getCartState();
      expect(cartState.items).toHaveLength(1);
      expect(cartState.items[0].quantity).toBe(3);
    });

    it('should update product quantities', () => {
      posCore.addProductToCart(mockProduct, 1);
      
      let cartState = posCore.getCartState();
      const itemId = cartState.items[0].id;
      
      const result = posCore.updateProductQuantity(itemId, 5);
      expect(result).toBe(true);
      
      cartState = posCore.getCartState();
      expect(cartState.items[0].quantity).toBe(5);
    });
  });

  describe('Sales Statistics', () => {
    it('should return correct sales stats', () => {
      // Como es un módulo nuevo, las estadísticas deberían estar en cero
      const stats = posCore.getSalesStats(7);
      
      expect(stats.totalSales).toBe(0);
      expect(stats.totalAmount).toBe(0);
      expect(stats.averageSale).toBe(0);
      expect(stats.period).toBe(7);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid product data', () => {
      const invalidProduct = {
        ...mockProduct,
        price: -100 // Precio inválido
      };
      
      posCore.startNewSale();
      
      // El sistema debería manejar esto gracefully
      expect(() => {
        posCore.addProductToCart(invalidProduct as Product, 1);
      }).not.toThrow();
    });

    it('should handle operations without active sale', () => {
      // Intentar agregar producto sin venta activa
      const result = posCore.addProductToCart(mockProduct, 1);
      
      // Debería crear nueva venta automáticamente o manejar el error
      expect(result).toBe(true);
    });
  });

  describe('Module Configuration', () => {
    it('should have correct module configuration', () => {
      const config = posCore.getConfig();
      
      expect(config.id).toBe('pos-core');
      expect(config.optional).toBe(false);
      expect(config.dependencies).toHaveLength(0);
      expect(config.price).toBe(12000);
      expect(config.trialDays).toBe(30);
    });

    it('should validate license correctly', () => {
      const validLicense = 'POS-CORE-SYSTEM-DEFAULT';
      const invalidLicense = 'INVALID-LICENSE';
      
      expect(posCore.validateLicense(validLicense)).toBe(true);
      expect(posCore.validateLicense(invalidLicense)).toBe(true); // Core siempre válido
    });
  });
});