import { StorageManager, offlineStorage } from '@pos-argentina/shared';
import { FiadoTransaction } from '../customers.module';

export class FiadoManager {
  private storage: StorageManager;
  private transactions: Map<string, FiadoTransaction> = new Map();

  constructor() {
    this.storage = new StorageManager('fiado_transactions');
  }

  async initialize(): Promise<void> {
    console.log('Inicializando gestor de fiado...');
    await this.loadTransactions();
  }

  async activate(): Promise<void> {
    await this.loadTransactions();
    console.log(`Gestor de fiado activado con ${this.transactions.size} transacciones`);
  }

  async deactivate(): Promise<void> {
    console.log('Gestor de fiado desactivado');
  }

  async cleanup(): Promise<void> {
    this.transactions.clear();
    console.log('Transacciones de fiado limpiadas');
  }

  private async loadTransactions(): Promise<void> {
    try {
      // Cargar desde offline storage primero
      const offlineTransactions = await offlineStorage.getAll<FiadoTransaction>('fiado_transactions');
      
      // Si no hay transacciones offline, cargar desde localStorage
      if (offlineTransactions.length === 0) {
        const localTransactions = this.storage.load<FiadoTransaction[]>('transactions') || [];
        
        // Migrar a offline storage
        for (const transaction of localTransactions) {
          await offlineStorage.set('fiado_transactions', transaction.id, transaction, true);
        }
        
        localTransactions.forEach(transaction => {
          this.transactions.set(transaction.id, transaction);
        });
      } else {
        offlineTransactions.forEach(transaction => {
          this.transactions.set(transaction.id, transaction);
        });
      }

      // Limpiar transacciones muy antiguas (más de 2 años)
      await this.cleanOldTransactions();
    } catch (error) {
      console.error('Error cargando transacciones de fiado:', error);
    }
  }

  async grantFiado(customerId: string, amount: number, description: string, saleId?: string, userId: string = 'system'): Promise<FiadoTransaction> {
    // Validar datos de la transacción
    this.validateTransactionData({ customerId, amount, description, userId });

    const transaction: FiadoTransaction = {
      id: this.generateTransactionId(),
      customerId,
      type: 'debt',
      amount,
      description,
      saleId,
      userId,
      date: new Date()
    };

    this.transactions.set(transaction.id, transaction);
    
    await this.saveTransaction(transaction);
    await this.saveTransactionsToStorage();

    console.log(`Fiado otorgado: $${amount} para cliente ${customerId} - ${description}`);
    
    return transaction;
  }

  async recordPayment(customerId: string, amount: number, paymentMethod: string, userId: string = 'system', notes?: string): Promise<FiadoTransaction> {
    // Validar datos del pago
    this.validateTransactionData({ customerId, amount, description: 'Pago de fiado', userId });

    if (!paymentMethod || paymentMethod.trim() === '') {
      throw new Error('Método de pago es requerido');
    }

    const transaction: FiadoTransaction = {
      id: this.generateTransactionId(),
      customerId,
      type: 'payment',
      amount,
      description: `Pago de fiado - ${paymentMethod}`,
      paymentMethod,
      userId,
      date: new Date(),
      notes
    };

    this.transactions.set(transaction.id, transaction);
    
    await this.saveTransaction(transaction);
    await this.saveTransactionsToStorage();

    console.log(`Pago de fiado registrado: $${amount} para cliente ${customerId} - ${paymentMethod}`);
    
    return transaction;
  }

  async getTransaction(id: string): Promise<FiadoTransaction | null> {
    return this.transactions.get(id) || null;
  }

  async getTransactions(customerId?: string, limit?: number): Promise<FiadoTransaction[]> {
    let transactions = Array.from(this.transactions.values());

    // Filtrar por cliente si se especifica
    if (customerId) {
      transactions = transactions.filter(t => t.customerId === customerId);
    }

    // Ordenar por fecha (más recientes primero)
    transactions.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Aplicar límite si se especifica
    if (limit && limit > 0) {
      transactions = transactions.slice(0, limit);
    }

    return transactions;
  }

  async getTransactionsByType(type: FiadoTransaction['type'], customerId?: string, limit?: number): Promise<FiadoTransaction[]> {
    let transactions = Array.from(this.transactions.values())
      .filter(t => t.type === type);

    // Filtrar por cliente si se especifica
    if (customerId) {
      transactions = transactions.filter(t => t.customerId === customerId);
    }

    // Ordenar por fecha (más recientes primero)
    transactions.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Aplicar límite si se especifica
    if (limit && limit > 0) {
      transactions = transactions.slice(0, limit);
    }

    return transactions;
  }

  async getTransactionsByDateRange(startDate: Date, endDate: Date, customerId?: string): Promise<FiadoTransaction[]> {
    let transactions = Array.from(this.transactions.values())
      .filter(t => t.date >= startDate && t.date <= endDate);

    // Filtrar por cliente si se especifica
    if (customerId) {
      transactions = transactions.filter(t => t.customerId === customerId);
    }

    // Ordenar por fecha (más recientes primero)
    transactions.sort((a, b) => b.date.getTime() - a.date.getTime());

    return transactions;
  }

  async getCustomerBalance(customerId: string): Promise<{
    totalDebt: number;
    totalPayments: number;
    balance: number;
    lastTransaction: FiadoTransaction | null;
  }> {
    const customerTransactions = await this.getTransactions(customerId);
    
    let totalDebt = 0;
    let totalPayments = 0;

    customerTransactions.forEach(transaction => {
      if (transaction.type === 'debt') {
        totalDebt += transaction.amount;
      } else if (transaction.type === 'payment') {
        totalPayments += transaction.amount;
      }
    });

    const balance = totalDebt - totalPayments;
    const lastTransaction = customerTransactions.length > 0 ? customerTransactions[0] : null;

    return {
      totalDebt: Math.round(totalDebt * 100) / 100,
      totalPayments: Math.round(totalPayments * 100) / 100,
      balance: Math.max(0, Math.round(balance * 100) / 100),
      lastTransaction
    };
  }

  async getCustomersWithDebt(): Promise<{
    customerId: string;
    balance: number;
    lastTransaction: Date | null;
  }[]> {
    const customerBalances = new Map<string, { totalDebt: number; totalPayments: number; lastDate: Date | null }>();

    // Calcular balances por cliente
    this.transactions.forEach(transaction => {
      if (!customerBalances.has(transaction.customerId)) {
        customerBalances.set(transaction.customerId, {
          totalDebt: 0,
          totalPayments: 0,
          lastDate: null
        });
      }

      const customerData = customerBalances.get(transaction.customerId)!;
      
      if (transaction.type === 'debt') {
        customerData.totalDebt += transaction.amount;
      } else if (transaction.type === 'payment') {
        customerData.totalPayments += transaction.amount;
      }

      if (!customerData.lastDate || transaction.date > customerData.lastDate) {
        customerData.lastDate = transaction.date;
      }
    });

    // Filtrar solo clientes con deuda y formatear resultado
    const result: { customerId: string; balance: number; lastTransaction: Date | null }[] = [];

    customerBalances.forEach((data, customerId) => {
      const balance = data.totalDebt - data.totalPayments;
      if (balance > 0) {
        result.push({
          customerId,
          balance: Math.round(balance * 100) / 100,
          lastTransaction: data.lastDate
        });
      }
    });

    // Ordenar por mayor deuda
    return result.sort((a, b) => b.balance - a.balance);
  }

  async generateReport(startDate: Date, endDate: Date): Promise<{
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
    const transactions = await this.getTransactionsByDateRange(startDate, endDate);
    
    const report = {
      totalTransactions: transactions.length,
      totalDebts: 0,
      totalPayments: 0,
      netDebt: 0,
      customersSummary: {} as Record<string, {
        customerId: string;
        customerName: string;
        totalDebt: number;
        totalPayments: number;
        balance: number;
      }>
    };

    transactions.forEach(transaction => {
      // Contadores generales
      if (transaction.type === 'debt') {
        report.totalDebts += transaction.amount;
      } else if (transaction.type === 'payment') {
        report.totalPayments += transaction.amount;
      }

      // Resumen por cliente
      if (!report.customersSummary[transaction.customerId]) {
        report.customersSummary[transaction.customerId] = {
          customerId: transaction.customerId,
          customerName: 'Cliente', // Se podría obtener el nombre real
          totalDebt: 0,
          totalPayments: 0,
          balance: 0
        };
      }

      const customerSummary = report.customersSummary[transaction.customerId];
      if (transaction.type === 'debt') {
        customerSummary.totalDebt += transaction.amount;
      } else if (transaction.type === 'payment') {
        customerSummary.totalPayments += transaction.amount;
      }

      customerSummary.balance = customerSummary.totalDebt - customerSummary.totalPayments;
    });

    report.netDebt = report.totalDebts - report.totalPayments;

    // Redondear valores
    report.totalDebts = Math.round(report.totalDebts * 100) / 100;
    report.totalPayments = Math.round(report.totalPayments * 100) / 100;
    report.netDebt = Math.round(report.netDebt * 100) / 100;

    Object.values(report.customersSummary).forEach(customer => {
      customer.totalDebt = Math.round(customer.totalDebt * 100) / 100;
      customer.totalPayments = Math.round(customer.totalPayments * 100) / 100;
      customer.balance = Math.round(customer.balance * 100) / 100;
    });

    return report;
  }

  async deleteTransaction(id: string): Promise<boolean> {
    if (!this.transactions.has(id)) return false;

    this.transactions.delete(id);
    
    await offlineStorage.delete('fiado_transactions', id);
    await this.saveTransactionsToStorage();

    return true;
  }

  private async cleanOldTransactions(): Promise<void> {
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    const oldTransactions = Array.from(this.transactions.values())
      .filter(t => t.date < twoYearsAgo);

    for (const transaction of oldTransactions) {
      await this.deleteTransaction(transaction.id);
    }

    if (oldTransactions.length > 0) {
      console.log(`Eliminadas ${oldTransactions.length} transacciones antiguas de fiado`);
    }
  }

  private validateTransactionData(data: {
    customerId: string;
    amount: number;
    description: string;
    userId: string;
  }): void {
    if (!data.customerId || data.customerId.trim() === '') {
      throw new Error('ID de cliente es requerido');
    }

    if (typeof data.amount !== 'number' || data.amount <= 0) {
      throw new Error('Monto debe ser un número positivo');
    }

    if (!data.description || data.description.trim() === '') {
      throw new Error('Descripción es requerida');
    }

    if (!data.userId || data.userId.trim() === '') {
      throw new Error('ID de usuario es requerido');
    }
  }

  private async saveTransaction(transaction: FiadoTransaction): Promise<void> {
    try {
      // Guardar en offline storage
      await offlineStorage.set('fiado_transactions', transaction.id, transaction, false);
      
      // Agregar a cola de sincronización si está offline
      if (!navigator.onLine) {
        await offlineStorage.addToSyncQueue('create', 'fiado_transactions', transaction, transaction.id);
      }
    } catch (error) {
      console.error('Error guardando transacción de fiado:', error);
    }
  }

  private async saveTransactionsToStorage(): Promise<void> {
    try {
      const transactionsArray = Array.from(this.transactions.values());
      this.storage.save('transactions', transactionsArray);
    } catch (error) {
      console.error('Error guardando transacciones en localStorage:', error);
    }
  }

  private generateTransactionId(): string {
    return `fiado_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}