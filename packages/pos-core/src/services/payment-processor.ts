import { 
  PaymentData, 
  PaymentResult, 
  EventBus,
  generateId,
  formatCurrency,
  roundToCents
} from '@pos-argentina/shared';

/**
 * Procesador de pagos que maneja diferentes métodos
 * En esta versión básica maneja efectivo - otros módulos extenderán funcionalidad
 */
export class PaymentProcessor {
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Procesa un pago según el método especificado
   */
  async processPayment(paymentData: PaymentData): Promise<PaymentResult> {
    try {
      console.log(`💳 Processing ${paymentData.method} payment: ${formatCurrency(paymentData.amount)}`);

      switch (paymentData.method) {
        case 'cash':
          return await this.processCashPayment(paymentData);
          
        case 'credit_card':
        case 'debit_card':
          return await this.processCardPayment(paymentData);
          
        case 'mercadopago':
          return await this.processMercadoPagoPayment(paymentData);
          
        case 'qr':
          return await this.processQRPayment(paymentData);
          
        case 'account_credit':
          return await this.processAccountCreditPayment(paymentData);
          
        case 'mixed':
          return await this.processMixedPayment(paymentData);
          
        default:
          throw new Error(`Unsupported payment method: ${paymentData.method}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown payment error';
      console.error('❌ Payment processing failed:', errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Procesa pago en efectivo
   */
  private async processCashPayment(paymentData: PaymentData): Promise<PaymentResult> {
    try {
      // Validar monto mínimo
      if (paymentData.amount <= 0) {
        throw new Error('El monto debe ser mayor a cero');
      }

      // En pago efectivo, el monto puede ser mayor (dar vuelto)
      const change = roundToCents(Math.max(0, paymentData.amount - paymentData.amount));

      // Simular delay mínimo del mundo real
      await this.delay(100);

      const result: PaymentResult = {
        success: true,
        transactionId: generateId(),
        change: change > 0 ? change : undefined
      };

      console.log(`✅ Cash payment processed - Change: ${change > 0 ? formatCurrency(change) : 'None'}`);
      return result;
    } catch (error) {
      throw new Error(`Error procesando pago en efectivo: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Procesa pago con tarjeta (simulado - requiere integración real)
   */
  private async processCardPayment(paymentData: PaymentData): Promise<PaymentResult> {
    try {
      console.log('💳 Simulating card payment...');
      
      // Simular tiempo de procesamiento de tarjeta
      await this.delay(2000);

      // En versión básica, simulamos éxito del 95%
      const success = Math.random() > 0.05;

      if (!success) {
        throw new Error('Tarjeta rechazada - Verifique los datos o contacte a su banco');
      }

      const result: PaymentResult = {
        success: true,
        transactionId: generateId(),
        authCode: this.generateAuthCode()
      };

      console.log(`✅ Card payment processed - Auth: ${result.authCode}`);
      return result;
    } catch (error) {
      throw new Error(`Error procesando pago con tarjeta: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Procesa pago con MercadoPago (simulado - requiere SDK real)
   */
  private async processMercadoPagoPayment(paymentData: PaymentData): Promise<PaymentResult> {
    try {
      console.log('📱 Simulating MercadoPago payment...');
      
      // Simular tiempo de procesamiento
      await this.delay(3000);

      // Simular éxito del 98%
      const success = Math.random() > 0.02;

      if (!success) {
        throw new Error('Error en MercadoPago - Intente nuevamente');
      }

      const result: PaymentResult = {
        success: true,
        transactionId: generateId(),
        authCode: `MP_${this.generateAuthCode()}`
      };

      console.log(`✅ MercadoPago payment processed - ID: ${result.transactionId}`);
      return result;
    } catch (error) {
      throw new Error(`Error procesando pago MercadoPago: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Procesa pago con QR
   */
  private async processQRPayment(paymentData: PaymentData): Promise<PaymentResult> {
    try {
      console.log('📲 Processing QR payment...');
      
      await this.delay(1500);

      const result: PaymentResult = {
        success: true,
        transactionId: generateId(),
        authCode: `QR_${this.generateAuthCode()}`
      };

      console.log(`✅ QR payment processed`);
      return result;
    } catch (error) {
      throw new Error(`Error procesando pago QR: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Procesa pago con cuenta corriente (fiado)
   */
  private async processAccountCreditPayment(paymentData: PaymentData): Promise<PaymentResult> {
    try {
      if (!paymentData.customerId) {
        throw new Error('ID de cliente requerido para cuenta corriente');
      }

      console.log(`🏪 Processing account credit payment for customer: ${paymentData.customerId}`);
      
      // En esta versión básica, delegamos la validación al módulo de clientes
      // Por ahora simulamos éxito
      await this.delay(500);

      const result: PaymentResult = {
        success: true,
        transactionId: generateId(),
        authCode: `CREDIT_${paymentData.customerId}`
      };

      console.log(`✅ Account credit payment processed`);
      return result;
    } catch (error) {
      throw new Error(`Error procesando cuenta corriente: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Procesa pago mixto (múltiples métodos)
   */
  private async processMixedPayment(paymentData: PaymentData): Promise<PaymentResult> {
    try {
      console.log('🔀 Processing mixed payment...');
      
      // En versión básica, tratamos como pago en efectivo
      // Versiones futuras podrán manejar múltiples métodos
      return await this.processCashPayment(paymentData);
    } catch (error) {
      throw new Error(`Error procesando pago mixto: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Valida si un método de pago está disponible
   */
  isPaymentMethodAvailable(method: string): boolean {
    const availableMethods = [
      'cash',
      'credit_card',
      'debit_card',
      'mercadopago',
      'qr',
      'account_credit',
      'mixed'
    ];

    return availableMethods.includes(method);
  }

  /**
   * Obtiene los métodos de pago disponibles
   */
  getAvailablePaymentMethods() {
    return [
      {
        id: 'cash',
        name: 'Efectivo',
        icon: '💵',
        available: true,
        description: 'Pago en efectivo con vuelto'
      },
      {
        id: 'credit_card',
        name: 'Tarjeta de Crédito',
        icon: '💳',
        available: true,
        description: 'Visa, Mastercard, American Express'
      },
      {
        id: 'debit_card',
        name: 'Tarjeta de Débito',
        icon: '💳',
        available: true,
        description: 'Débito inmediato'
      },
      {
        id: 'mercadopago',
        name: 'MercadoPago',
        icon: '📱',
        available: true,
        description: 'Pago digital con MercadoPago'
      },
      {
        id: 'qr',
        name: 'QR',
        icon: '📲',
        available: true,
        description: 'Código QR interoperable'
      },
      {
        id: 'account_credit',
        name: 'Cuenta Corriente',
        icon: '🏪',
        available: true,
        description: 'Fiado del cliente'
      }
    ];
  }

  // ===========================================
  // MÉTODOS PRIVADOS
  // ===========================================

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateAuthCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  /**
   * Validaciones específicas por método de pago
   */
  private validatePaymentData(paymentData: PaymentData): void {
    if (paymentData.amount <= 0) {
      throw new Error('El monto debe ser mayor a cero');
    }

    switch (paymentData.method) {
      case 'account_credit':
        if (!paymentData.customerId) {
          throw new Error('ID de cliente requerido para cuenta corriente');
        }
        break;

      case 'credit_card':
        if (paymentData.installments && (paymentData.installments < 1 || paymentData.installments > 24)) {
          throw new Error('Número de cuotas inválido (1-24)');
        }
        break;

      default:
        // Validaciones generales ya aplicadas
        break;
    }
  }
}