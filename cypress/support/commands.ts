// Comandos personalizados de Cypress para POS Argentina

/// <reference types="cypress" />

// Comando para login como vendedor
Cypress.Commands.add('loginAsVendedor', () => {
  cy.visit('/');
  cy.get('[data-testid="login-button"]', { timeout: 10000 }).should('be.visible');
  // En esta versión básica no hay login, pero el comando está preparado
});

// Comando para agregar producto al carrito
Cypress.Commands.add('addProductToCart', (productName: string) => {
  cy.get('[data-testid="search-input"]').type(productName);
  cy.get('[data-testid="product-card"]')
    .contains(productName)
    .first()
    .click();
  
  cy.get('[data-testid="cart-items"]').should('contain', productName);
});

// Comando para procesar pago
Cypress.Commands.add('processPayment', (method: string, amount?: number) => {
  cy.get('[data-testid="pay-button"]').click();
  
  cy.get('[data-testid="payment-dialog"]').should('be.visible');
  cy.get(`[data-testid="payment-method-${method}"]`).click();
  
  if (method === 'cash' && amount) {
    cy.get('[data-testid="cash-amount-input"]').clear().type(amount.toString());
  }
  
  cy.get('[data-testid="process-payment-button"]').click();
});

// Comando para limpiar carrito
Cypress.Commands.add('clearCart', () => {
  cy.get('[data-testid="clear-cart-button"]').click();
  cy.get('[data-testid="cart-items"]').should('be.empty');
});

// Agregar soporte para testing de PWA
Cypress.Commands.add('installPWA', () => {
  cy.window().then((win) => {
    // Simular instalación de PWA
    const event = new Event('beforeinstallprompt');
    win.dispatchEvent(event);
  });
});

// Comando para verificar funcionamiento offline
Cypress.Commands.add('goOffline', () => {
  cy.window().then((win) => {
    Object.defineProperty(win.navigator, 'onLine', {
      writable: true,
      value: false,
    });
    
    win.dispatchEvent(new Event('offline'));
  });
});

Cypress.Commands.add('goOnline', () => {
  cy.window().then((win) => {
    Object.defineProperty(win.navigator, 'onLine', {
      writable: true,
      value: true,
    });
    
    win.dispatchEvent(new Event('online'));
  });
});

// Declaración de tipos para TypeScript
declare global {
  namespace Cypress {
    interface Chainable {
      loginAsVendedor(): Chainable<void>;
      addProductToCart(productName: string): Chainable<void>;
      processPayment(method: string, amount?: number): Chainable<void>;
      clearCart(): Chainable<void>;
      installPWA(): Chainable<void>;
      goOffline(): Chainable<void>;
      goOnline(): Chainable<void>;
    }
  }
}