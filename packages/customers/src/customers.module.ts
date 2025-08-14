import { BaseModule, ModuleConfig, Customer, EventBus, SystemEvents } from '@pos-argentina/shared';
import { CustomersManager } from './services/customers-manager';
import { FiadoManager } from './services/fiado-manager';
import { PaymentsManager } from './services/payments-manager';
import { LoyaltyManager } from './services/loyalty-manager';

export interface CustomersModuleEvents {
  CUSTOMER_CREATED: 'customers:customer_created';
  CUSTOMER_UPDATED: 'customers:customer_updated';
  FIADO_GRANTED: 'customers:fiado_granted';
  FIADO_PAYMENT: 'customers:fiado_payment';
  CREDIT_LIMIT_EXCEEDED: 'customers:credit_limit_exceeded';
  LOYALTY_POINTS_EARNED: 'customers:loyalty_points_earned';
  LOYALTY_POINTS_REDEEMED: 'customers:loyalty_points_redeemed';
}

export const CustomersEvents: CustomersModuleEvents = {
  CUSTOMER_CREATED: 'customers:customer_created',
  CUSTOMER_UPDATED: 'customers:customer_updated',
  FIADO_GRANTED: 'customers:fiado_granted',
  FIADO_PAYMENT: 'customers:fiado_payment',
  CREDIT_LIMIT_EXCEEDED: 'customers:credit_limit_exceeded',
  LOYALTY_POINTS_EARNED: 'customers:loyalty_points_earned',
  LOYALTY_POINTS_REDEEMED: 'customers:loyalty_points_redeemed'
};

export interface FiadoTransaction {
  id: string;
  customerId: string;
  type: 'debt' | 'payment';
  amount: number;
  description: string;
  saleId?: string;
  paymentMethod?: string;
  userId: string;
  date: Date;
  notes?: string;
}

export interface CustomerExtended extends Customer {
  fiadoBalance: number;
  fiadoLimit: number;
  loyaltyPoints: number;
  lastVisit: Date | null;
  totalPurchases: number;
  averageTicket: number;
  status: 'active' | 'inactive' | 'blocked';
}

export interface LoyaltyRule {
  id: string;
  name: string;
  type: 'points_per_peso' | 'bonus_points' | 'multiplier';
  value: number;
  minAmount?: number;
  category?: string;
  active: boolean;
  validFrom: Date;
  validTo?: Date;
}

export interface LoyaltyRedemption {
  id: string;
  customerId: string;
  pointsUsed: number;
  discountAmount: number;
  saleId: string;
  userId: string;
  date: Date;
}

export class CustomersModule extends BaseModule {
  private customersManager: CustomersManager;
  private fiadoManager: FiadoManager;
  private paymentsManager: PaymentsManager;
  private loyaltyManager: LoyaltyManager;

  constructor() {
    super();
    this.customersManager = new CustomersManager();
    this.fiadoManager = new FiadoManager();
    this.paymentsManager = new PaymentsManager();
    this.loyaltyManager = new LoyaltyManager();
  }

  getConfig(): ModuleConfig {
    return {
      id: 'customers',
      name: 'Gestión de Clientes y Fiado',
      description: 'Sistema completo de clientes con fiado, fidelización y pagos',
      version: '1.0.0',
      author: 'POS Argentina',
      category: 'business',
      optional: true,
      dependencies: [],
      price: 25000,
      trialDays: 7,
      features: [
        'Gestión completa de clientes',
        'Sistema de fiado argentino',
        'Límites de crédito personalizados',
        'Historial de compras y pagos',
        'Sistema de fidelización',
        'Puntos de lealtad',
        'Descuentos automáticos',
        'Reportes de cobranzas',
        'Alertas de vencimientos',
        'Gestión de morosos'
      ]
    };
  }

  async onInstall(): Promise<boolean> {
    try {
      console.log('Instalando módulo de clientes...');
      
      await this.customersManager.initialize();
      await this.fiadoManager.initialize();
      await this.paymentsManager.initialize();
      await this.loyaltyManager.initialize();

      this.setupEventListeners();
      
      console.log('Módulo de clientes instalado correctamente');
      return true;
    } catch (error) {
      console.error('Error instalando módulo de clientes:', error);
      return false;
    }
  }

  async onUninstall(): Promise<boolean> {
    try {
      console.log('Desinstalando módulo de clientes...');
      
      this.removeEventListeners();
      
      await this.loyaltyManager.cleanup();
      await this.paymentsManager.cleanup();
      await this.fiadoManager.cleanup();
      await this.customersManager.cleanup();
      
      console.log('Módulo de clientes desinstalado correctamente');
      return true;
    } catch (error) {
      console.error('Error desinstalando módulo de clientes:', error);
      return false;
    }
  }

  async onActivate(): Promise<void> {
    console.log('Activando módulo de clientes...');
    
    await this.customersManager.activate();
    await this.fiadoManager.activate();
    await this.paymentsManager.activate();
    await this.loyaltyManager.activate();
    
    this.startPeriodicTasks();
    
    EventBus.emit(SystemEvents.MODULE_ACTIVATED, { moduleId: this.getId() });
  }

  async onDeactivate(): Promise<void> {
    console.log('Desactivando módulo de clientes...');
    
    this.stopPeriodicTasks();
    
    await this.loyaltyManager.deactivate();
    await this.paymentsManager.deactivate();
    await this.fiadoManager.deactivate();
    await this.customersManager.deactivate();
    
    EventBus.emit(SystemEvents.MODULE_DEACTIVATED, { moduleId: this.getId() });
  }

  validateLicense(license: string): boolean {
    const validFormats = [
      'POS-CUSTOMERS-SYSTEM-',
      'POS-CUST-PREMIUM-',
      'POS-FIADO-PRO-'
    ];
    
    return validFormats.some(format => license.startsWith(format)) && 
           license.length >= 20;
  }

  // Métodos públicos del módulo - Clientes

  async addCustomer(customer: Omit<CustomerExtended, 'id' | 'created' | 'updated' | 'fiadoBalance' | 'loyaltyPoints' | 'lastVisit' | 'totalPurchases' | 'averageTicket'>): Promise<CustomerExtended> {
    const newCustomer = await this.customersManager.addCustomer(customer);
    
    EventBus.emit(CustomersEvents.CUSTOMER_CREATED, { 
      customer: newCustomer 
    });
    
    return newCustomer;
  }

  async updateCustomer(id: string, updates: Partial<CustomerExtended>): Promise<CustomerExtended | null> {
    const updatedCustomer = await this.customersManager.updateCustomer(id, updates);
    
    if (updatedCustomer) {
      EventBus.emit(CustomersEvents.CUSTOMER_UPDATED, { 
        customer: updatedCustomer 
      });
    }
    
    return updatedCustomer;
  }

  async getCustomer(id: string): Promise<CustomerExtended | null> {
    return this.customersManager.getCustomer(id);
  }

  async getAllCustomers(): Promise<CustomerExtended[]> {
    return this.customersManager.getAllCustomers();
  }

  async searchCustomers(query: string): Promise<CustomerExtended[]> {
    return this.customersManager.searchCustomers(query);
  }

  async getCustomerByPhone(phone: string): Promise<CustomerExtended | null> {
    return this.customersManager.getCustomerByPhone(phone);
  }

  async getCustomerByEmail(email: string): Promise<CustomerExtended | null> {
    return this.customersManager.getCustomerByEmail(email);
  }

  // Métodos públicos del módulo - Fiado

  async grantFiado(customerId: string, amount: number, description: string, saleId?: string, userId?: string): Promise<FiadoTransaction> {
    const customer = await this.getCustomer(customerId);
    if (!customer) {
      throw new Error('Cliente no encontrado');
    }

    // Verificar límite de crédito
    if (customer.fiadoBalance + amount > customer.fiadoLimit) {
      EventBus.emit(CustomersEvents.CREDIT_LIMIT_EXCEEDED, {
        customer,
        requestedAmount: amount,
        currentBalance: customer.fiadoBalance,
        creditLimit: customer.fiadoLimit
      });
      throw new Error('Límite de crédito excedido');
    }

    const transaction = await this.fiadoManager.grantFiado(customerId, amount, description, saleId, userId || 'system');
    
    // Actualizar balance del cliente
    await this.updateCustomer(customerId, {
      fiadoBalance: customer.fiadoBalance + amount
    });

    EventBus.emit(CustomersEvents.FIADO_GRANTED, {
      customer,
      transaction
    });

    return transaction;
  }

  async recordFiadoPayment(customerId: string, amount: number, paymentMethod: string, userId?: string, notes?: string): Promise<FiadoTransaction> {
    const customer = await this.getCustomer(customerId);
    if (!customer) {
      throw new Error('Cliente no encontrado');
    }

    const transaction = await this.fiadoManager.recordPayment(customerId, amount, paymentMethod, userId || 'system', notes);
    
    // Actualizar balance del cliente
    const newBalance = Math.max(0, customer.fiadoBalance - amount);
    await this.updateCustomer(customerId, {
      fiadoBalance: newBalance
    });

    EventBus.emit(CustomersEvents.FIADO_PAYMENT, {
      customer,
      transaction
    });

    return transaction;
  }

  async getFiadoTransactions(customerId: string, limit?: number): Promise<FiadoTransaction[]> {
    return this.fiadoManager.getTransactions(customerId, limit);
  }

  async getFiadoBalance(customerId: string): Promise<number> {
    const customer = await this.getCustomer(customerId);
    return customer?.fiadoBalance || 0;
  }

  async getCustomersWithDebt(): Promise<CustomerExtended[]> {
    return this.customersManager.getCustomersWithDebt();
  }

  // Métodos públicos del módulo - Fidelización

  async earnLoyaltyPoints(customerId: string, saleAmount: number, saleId: string): Promise<number> {
    const pointsEarned = await this.loyaltyManager.earnPoints(customerId, saleAmount, saleId);
    
    if (pointsEarned > 0) {
      const customer = await this.getCustomer(customerId);
      if (customer) {
        await this.updateCustomer(customerId, {
          loyaltyPoints: customer.loyaltyPoints + pointsEarned
        });

        EventBus.emit(CustomersEvents.LOYALTY_POINTS_EARNED, {
          customer,
          pointsEarned,
          saleAmount,
          saleId
        });
      }
    }

    return pointsEarned;
  }

  async redeemLoyaltyPoints(customerId: string, pointsToRedeem: number, saleId: string, userId?: string): Promise<{ redemption: LoyaltyRedemption; discountAmount: number }> {
    const customer = await this.getCustomer(customerId);
    if (!customer) {
      throw new Error('Cliente no encontrado');
    }

    if (customer.loyaltyPoints < pointsToRedeem) {
      throw new Error('Puntos insuficientes');
    }

    const redemption = await this.loyaltyManager.redeemPoints(customerId, pointsToRedeem, saleId, userId || 'system');
    
    // Actualizar puntos del cliente
    await this.updateCustomer(customerId, {
      loyaltyPoints: customer.loyaltyPoints - pointsToRedeem
    });

    EventBus.emit(CustomersEvents.LOYALTY_POINTS_REDEEMED, {
      customer,
      redemption
    });

    return {
      redemption,
      discountAmount: redemption.discountAmount
    };
  }

  async getLoyaltyRules(): Promise<LoyaltyRule[]> {
    return this.loyaltyManager.getRules();
  }

  async addLoyaltyRule(rule: Omit<LoyaltyRule, 'id'>): Promise<LoyaltyRule> {
    return this.loyaltyManager.addRule(rule);
  }

  // Métodos de reportes

  async generateCustomersReport(): Promise<{
    totalCustomers: number;
    activeCustomers: number;
    customersWithDebt: number;
    totalDebt: number;
    averageDebt: number;
    totalLoyaltyPoints: number;
  }> {
    return this.customersManager.generateReport();
  }

  async generateFiadoReport(startDate: Date, endDate: Date): Promise<{
    totalTransactions: number;
    totalDebts: number;
    totalPayments: number;
    netDebt: number;
    customersSummary: Record<string, {
      customerId: string;
      customerName: string;
      totalDebt: number;
      totalPayments: number;
      balance: number;
    }>;
  }> {
    return this.fiadoManager.generateReport(startDate, endDate);
  }

  // Métodos privados

  private setupEventListeners(): void {
    // Escuchar ventas para procesar fiado y puntos de lealtad
    EventBus.on('pos:sale_completed', this.handleSaleCompleted.bind(this));
  }

  private removeEventListeners(): void {
    EventBus.off('pos:sale_completed', this.handleSaleCompleted.bind(this));
  }

  private async handleSaleCompleted(data: any): Promise<void> {
    if (data.sale && data.sale.customerId) {
      const sale = data.sale;
      
      // Si la venta fue a fiado, registrar la deuda
      if (sale.paymentMethod === 'fiado') {
        await this.grantFiado(
          sale.customerId,
          sale.total,
          `Venta #${sale.id}`,
          sale.id,
          sale.userId
        );
      }
      
      // Procesar puntos de lealtad para todas las ventas
      await this.earnLoyaltyPoints(sale.customerId, sale.total, sale.id);
      
      // Actualizar estadísticas del cliente
      await this.customersManager.updateCustomerStats(sale.customerId, sale.total);
    }
  }

  private startPeriodicTasks(): void {
    // Verificar vencimientos de fiado cada día
    setInterval(() => {
      this.checkOverduePayments();
    }, 24 * 60 * 60 * 1000);
  }

  private stopPeriodicTasks(): void {
    // Limpiar intervalos si es necesario
  }

  private async checkOverduePayments(): Promise<void> {
    try {
      const customersWithDebt = await this.getCustomersWithDebt();
      
      for (const customer of customersWithDebt) {
        // Lógica para verificar pagos vencidos
        // Esto se podría expandir con fechas de vencimiento
        if (customer.fiadoBalance > customer.fiadoLimit * 0.8) {
          console.log(`Cliente ${customer.name} cerca del límite de crédito`);
        }
      }
    } catch (error) {
      console.error('Error verificando pagos vencidos:', error);
    }
  }
}