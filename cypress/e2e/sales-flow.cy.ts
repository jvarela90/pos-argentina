// Test E2E del flujo completo de ventas

describe('Flujo de Ventas POS', () => {
  beforeEach(() => {
    cy.visit('/');
    
    // Esperar que la aplicación cargue completamente
    cy.get('[data-testid="pos-terminal"]', { timeout: 10000 }).should('be.visible');
  });

  it('Debe mostrar la pantalla principal del terminal', () => {
    cy.get('h1').should('contain', 'Almacén Don Carlos');
    cy.get('[data-testid="product-grid"]').should('be.visible');
    cy.get('[data-testid="cart-section"]').should('be.visible');
  });

  it('Debe permitir buscar productos', () => {
    const searchTerm = 'Pan';
    
    cy.get('[data-testid="search-input"]')
      .type(searchTerm)
      .should('have.value', searchTerm);
    
    cy.get('[data-testid="product-card"]')
      .should('be.visible')
      .and('contain', searchTerm);
  });

  it('Debe agregar productos al carrito', () => {
    // Agregar primer producto
    cy.get('[data-testid="product-card"]')
      .first()
      .click();
    
    // Verificar que aparece en el carrito
    cy.get('[data-testid="cart-items"]')
      .should('not.be.empty');
    
    cy.get('[data-testid="cart-total"]')
      .should('not.contain', '$0');
  });

  it('Debe procesar una venta completa con efectivo', () => {
    // Agregar producto al carrito
    cy.get('[data-testid="product-card"]')
      .contains('Pan Lactal')
      .click();
    
    // Verificar que el total no es cero
    cy.get('[data-testid="cart-total"]')
      .invoke('text')
      .then((totalText) => {
        expect(totalText).to.not.equal('$0');
        
        const total = parseFloat(totalText.replace(/[$,]/g, ''));
        
        // Procesar pago
        cy.get('[data-testid="pay-button"]').click();
        cy.get('[data-testid="payment-method-cash"]').click();
        
        // Ingresar monto mayor al total
        cy.get('[data-testid="cash-amount-input"]')
          .clear()
          .type((total + 100).toString());
        
        cy.get('[data-testid="process-payment-button"]').click();
        
        // Verificar éxito
        cy.get('[data-testid="payment-success"]', { timeout: 10000 })
          .should('be.visible');
        
        // Verificar que el carrito se limpió
        cy.get('[data-testid="cart-items"]', { timeout: 5000 })
          .should('be.empty');
      });
  });

  it('Debe manejar múltiples productos en el carrito', () => {
    // Agregar varios productos
    const products = ['Pan Lactal', 'Leche Entera', 'Coca Cola'];
    
    products.forEach((product) => {
      cy.get('[data-testid="search-input"]').clear().type(product);
      cy.get('[data-testid="product-card"]')
        .contains(product)
        .first()
        .click();
    });
    
    // Verificar que todos están en el carrito
    cy.get('[data-testid="cart-item"]')
      .should('have.length', products.length);
    
    products.forEach((product) => {
      cy.get('[data-testid="cart-items"]')
        .should('contain', product);
    });
  });

  it('Debe permitir modificar cantidades en el carrito', () => {
    // Agregar producto
    cy.get('[data-testid="product-card"]')
      .first()
      .click();
    
    // Aumentar cantidad
    cy.get('[data-testid="quantity-increase"]')
      .first()
      .click();
    
    cy.get('[data-testid="item-quantity"]')
      .first()
      .should('contain', '2');
    
    // Disminuir cantidad
    cy.get('[data-testid="quantity-decrease"]')
      .first()
      .click();
    
    cy.get('[data-testid="item-quantity"]')
      .first()
      .should('contain', '1');
  });

  it('Debe permitir remover productos del carrito', () => {
    // Agregar producto
    cy.get('[data-testid="product-card"]')
      .first()
      .click();
    
    // Remover producto
    cy.get('[data-testid="remove-item"]')
      .first()
      .click();
    
    cy.get('[data-testid="cart-items"]')
      .should('be.empty');
  });

  it('Debe limpiar todo el carrito', () => {
    // Agregar varios productos
    cy.get('[data-testid="product-card"]')
      .first()
      .click();
    
    cy.get('[data-testid="product-card"]')
      .eq(1)
      .click();
    
    // Limpiar carrito
    cy.get('[data-testid="clear-cart-button"]')
      .click();
    
    cy.get('[data-testid="cart-items"]')
      .should('be.empty');
  });

  it('Debe mostrar error si intenta pagar carrito vacío', () => {
    cy.get('[data-testid="pay-button"]')
      .should('be.disabled');
  });

  it('Debe filtrar productos por categoría', () => {
    // Verificar que hay varias categorías
    cy.get('[data-testid="category-filter"]')
      .should('have.length.greaterThan', 1);
    
    // Filtrar por categoría específica
    cy.get('[data-testid="category-filter"]')
      .contains('Bebidas')
      .click();
    
    cy.get('[data-testid="product-card"]')
      .should('be.visible')
      .each(($el) => {
        cy.wrap($el).should('contain', 'Coca Cola');
      });
  });

  it('Debe mostrar alertas de stock bajo', () => {
    // Verificar badge de stock bajo en navegación
    cy.get('[data-testid="inventory-badge"]')
      .should('be.visible');
  });

  it('Debe funcionar en modo offline', () => {
    // Agregar producto al carrito
    cy.get('[data-testid="product-card"]')
      .first()
      .click();
    
    // Simular offline
    cy.goOffline();
    
    // Verificar indicador offline
    cy.get('[data-testid="offline-indicator"]')
      .should('contain', 'Offline');
    
    // Agregar otro producto (debería funcionar offline)
    cy.get('[data-testid="product-card"]')
      .eq(1)
      .click();
    
    cy.get('[data-testid="cart-items"]')
      .children()
      .should('have.length', 2);
    
    // Volver online
    cy.goOnline();
    
    cy.get('[data-testid="online-indicator"]')
      .should('contain', 'Online');
  });

  it('Debe procesar venta con tarjeta (simulado)', () => {
    cy.get('[data-testid="product-card"]')
      .first()
      .click();
    
    cy.get('[data-testid="pay-button"]').click();
    cy.get('[data-testid="payment-method-credit_card"]').click();
    
    cy.get('[data-testid="process-payment-button"]').click();
    
    // Verificar simulación de procesamiento
    cy.get('[data-testid="payment-processing"]')
      .should('be.visible');
    
    cy.get('[data-testid="payment-success"]', { timeout: 15000 })
      .should('be.visible');
  });
});