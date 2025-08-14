// Cypress E2E support file

import './commands';

// Configuración global para E2E tests
Cypress.on('uncaught:exception', (err, runnable) => {
  // returning false here prevents Cypress from failing the test
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false;
  }
  return true;
});

// Comandos personalizados antes de cada test
beforeEach(() => {
  // Limpiar localStorage y sessionStorage
  cy.clearLocalStorage();
  cy.clearCookies();
  
  // Mock de APIs externas si es necesario
  cy.intercept('GET', '/api/health', { fixture: 'health.json' });
});

// Configuración para tests de POS
declare global {
  namespace Cypress {
    interface Chainable {
      // Comandos personalizados del POS
      loginAsVendedor(): Chainable<void>;
      addProductToCart(productName: string): Chainable<void>;
      processPayment(method: string, amount?: number): Chainable<void>;
      clearCart(): Chainable<void>;
    }
  }
}