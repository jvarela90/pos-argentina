import { StorageManager, offlineStorage } from '@pos-argentina/shared';

export interface PaymentPlan {
  id: string;
  customerId: string;
  totalAmount: number;
  installments: number;
  installmentAmount: number;
  startDate: Date;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  description: string;
  status: 'active' | 'completed' | 'cancelled';
  created: Date;
  updated: Date;
}

export interface PaymentPlanInstallment {
  id: string;
  planId: string;
  installmentNumber: number;
  amount: number;
  dueDate: Date;
  paidDate?: Date;
  paidAmount?: number;
  status: 'pending' | 'paid' | 'overdue' | 'partial';
  notes?: string;
}

export class PaymentsManager {
  private storage: StorageManager;
  private paymentPlans: Map<string, PaymentPlan> = new Map();
  private installments: Map<string, PaymentPlanInstallment> = new Map();

  constructor() {
    this.storage = new StorageManager('payment_plans');
  }

  async initialize(): Promise<void> {
    console.log('Inicializando gestor de planes de pago...');
    await this.loadPaymentPlans();
    await this.loadInstallments();
  }

  async activate(): Promise<void> {
    await this.loadPaymentPlans();
    await this.loadInstallments();
    console.log(`Gestor de pagos activado con ${this.paymentPlans.size} planes de pago`);
  }

  async deactivate(): Promise<void> {
    console.log('Gestor de pagos desactivado');
  }

  async cleanup(): Promise<void> {
    this.paymentPlans.clear();
    this.installments.clear();
    console.log('Planes de pago limpiados');
  }

  private async loadPaymentPlans(): Promise<void> {
    try {
      // Cargar desde offline storage primero
      const offlinePlans = await offlineStorage.getAll<PaymentPlan>('payment_plans');
      
      // Si no hay planes offline, cargar desde localStorage
      if (offlinePlans.length === 0) {
        const localPlans = this.storage.load<PaymentPlan[]>('plans') || [];
        
        // Migrar a offline storage
        for (const plan of localPlans) {
          await offlineStorage.set('payment_plans', plan.id, plan, true);
        }
        
        localPlans.forEach(plan => {
          this.paymentPlans.set(plan.id, plan);
        });
      } else {
        offlinePlans.forEach(plan => {
          this.paymentPlans.set(plan.id, plan);
        });
      }
    } catch (error) {
      console.error('Error cargando planes de pago:', error);
    }
  }

  private async loadInstallments(): Promise<void> {
    try {
      // Cargar desde offline storage primero
      const offlineInstallments = await offlineStorage.getAll<PaymentPlanInstallment>('payment_installments');
      
      // Si no hay cuotas offline, cargar desde localStorage
      if (offlineInstallments.length === 0) {
        const localInstallments = this.storage.load<PaymentPlanInstallment[]>('installments') || [];
        
        // Migrar a offline storage
        for (const installment of localInstallments) {
          await offlineStorage.set('payment_installments', installment.id, installment, true);
        }
        
        localInstallments.forEach(installment => {
          this.installments.set(installment.id, installment);
        });
      } else {
        offlineInstallments.forEach(installment => {
          this.installments.set(installment.id, installment);
        });
      }

      // Actualizar estados de cuotas vencidas
      await this.updateOverdueInstallments();
    } catch (error) {
      console.error('Error cargando cuotas:', error);
    }
  }

  async createPaymentPlan(
    customerId: string,
    totalAmount: number,
    installments: number,
    frequency: PaymentPlan['frequency'],
    description: string
  ): Promise<PaymentPlan> {
    // Validar datos del plan
    this.validatePaymentPlanData({ customerId, totalAmount, installments, frequency, description });

    const installmentAmount = Math.round((totalAmount / installments) * 100) / 100;
    
    const plan: PaymentPlan = {
      id: this.generatePlanId(),
      customerId,
      totalAmount,
      installments,
      installmentAmount,
      startDate: new Date(),
      frequency,
      description,
      status: 'active',
      created: new Date(),
      updated: new Date()
    };

    this.paymentPlans.set(plan.id, plan);
    
    // Crear las cuotas del plan
    await this.createInstallments(plan);
    
    await this.savePaymentPlan(plan);
    await this.savePaymentPlansToStorage();

    console.log(`Plan de pago creado: ${installments} cuotas de $${installmentAmount} para cliente ${customerId}`);
    
    return plan;
  }

  async getPaymentPlan(id: string): Promise<PaymentPlan | null> {
    return this.paymentPlans.get(id) || null;
  }

  async getCustomerPaymentPlans(customerId: string): Promise<PaymentPlan[]> {
    return Array.from(this.paymentPlans.values())
      .filter(plan => plan.customerId === customerId)
      .sort((a, b) => b.created.getTime() - a.created.getTime());
  }

  async getActivePaymentPlans(): Promise<PaymentPlan[]> {
    return Array.from(this.paymentPlans.values())
      .filter(plan => plan.status === 'active')
      .sort((a, b) => b.created.getTime() - a.created.getTime());
  }

  async getPlanInstallments(planId: string): Promise<PaymentPlanInstallment[]> {
    return Array.from(this.installments.values())
      .filter(installment => installment.planId === planId)
      .sort((a, b) => a.installmentNumber - b.installmentNumber);
  }

  async getOverdueInstallments(): Promise<PaymentPlanInstallment[]> {
    return Array.from(this.installments.values())
      .filter(installment => installment.status === 'overdue')
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }

  async getDueInstallments(daysAhead: number = 7): Promise<PaymentPlanInstallment[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return Array.from(this.installments.values())
      .filter(installment => 
        installment.status === 'pending' && 
        installment.dueDate <= futureDate
      )
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }

  async payInstallment(
    installmentId: string,
    paidAmount: number,
    notes?: string
  ): Promise<PaymentPlanInstallment> {
    const installment = this.installments.get(installmentId);
    if (!installment) {
      throw new Error('Cuota no encontrada');
    }

    if (installment.status === 'paid') {
      throw new Error('Esta cuota ya fue pagada');
    }

    if (paidAmount <= 0) {
      throw new Error('El monto pagado debe ser positivo');
    }

    // Determinar nuevo estado
    let newStatus: PaymentPlanInstallment['status'] = 'paid';
    if (paidAmount < installment.amount) {
      newStatus = 'partial';
    }

    const updatedInstallment: PaymentPlanInstallment = {
      ...installment,
      paidDate: new Date(),
      paidAmount: (installment.paidAmount || 0) + paidAmount,
      status: newStatus,
      notes: notes || installment.notes
    };

    this.installments.set(installmentId, updatedInstallment);
    
    await this.saveInstallment(updatedInstallment);
    await this.saveInstallmentsToStorage();

    // Verificar si el plan está completo
    await this.checkPlanCompletion(installment.planId);

    console.log(`Cuota pagada: $${paidAmount} de cuota ${installment.installmentNumber}`);
    
    return updatedInstallment;
  }

  async cancelPaymentPlan(planId: string): Promise<boolean> {
    const plan = this.paymentPlans.get(planId);
    if (!plan) return false;

    const updatedPlan: PaymentPlan = {
      ...plan,
      status: 'cancelled',
      updated: new Date()
    };

    this.paymentPlans.set(planId, updatedPlan);
    
    // Cancelar todas las cuotas pendientes
    const planInstallments = await this.getPlanInstallments(planId);
    for (const installment of planInstallments) {
      if (installment.status === 'pending' || installment.status === 'overdue') {
        // Aquí podrías cambiar el estado de las cuotas si necesitas
      }
    }

    await this.savePaymentPlan(updatedPlan);
    await this.savePaymentPlansToStorage();

    console.log(`Plan de pago ${planId} cancelado`);
    
    return true;
  }

  async generatePaymentReport(startDate: Date, endDate: Date): Promise<{
    totalPlans: number;
    activePlans: number;
    completedPlans: number;
    totalInstallments: number;
    paidInstallments: number;
    overdueInstallments: number;
    totalPaidAmount: number;
    totalPendingAmount: number;
  }> {
    const plans = Array.from(this.paymentPlans.values())
      .filter(plan => plan.created >= startDate && plan.created <= endDate);
    
    const installments = Array.from(this.installments.values())
      .filter(installment => {
        const plan = this.paymentPlans.get(installment.planId);
        return plan && plan.created >= startDate && plan.created <= endDate;
      });

    const activePlans = plans.filter(p => p.status === 'active').length;
    const completedPlans = plans.filter(p => p.status === 'completed').length;
    
    const paidInstallments = installments.filter(i => i.status === 'paid').length;
    const overdueInstallments = installments.filter(i => i.status === 'overdue').length;
    
    const totalPaidAmount = installments
      .filter(i => i.paidAmount !== undefined)
      .reduce((sum, i) => sum + (i.paidAmount || 0), 0);
    
    const totalPendingAmount = installments
      .filter(i => i.status === 'pending' || i.status === 'overdue')
      .reduce((sum, i) => sum + (i.amount - (i.paidAmount || 0)), 0);

    return {
      totalPlans: plans.length,
      activePlans,
      completedPlans,
      totalInstallments: installments.length,
      paidInstallments,
      overdueInstallments,
      totalPaidAmount: Math.round(totalPaidAmount * 100) / 100,
      totalPendingAmount: Math.round(totalPendingAmount * 100) / 100
    };
  }

  private async createInstallments(plan: PaymentPlan): Promise<void> {
    const startDate = new Date(plan.startDate);
    
    for (let i = 1; i <= plan.installments; i++) {
      const dueDate = this.calculateDueDate(startDate, i - 1, plan.frequency);
      
      const installment: PaymentPlanInstallment = {
        id: this.generateInstallmentId(),
        planId: plan.id,
        installmentNumber: i,
        amount: plan.installmentAmount,
        dueDate,
        status: 'pending'
      };

      this.installments.set(installment.id, installment);
      await this.saveInstallment(installment);
    }

    await this.saveInstallmentsToStorage();
  }

  private calculateDueDate(startDate: Date, installmentIndex: number, frequency: PaymentPlan['frequency']): Date {
    const dueDate = new Date(startDate);
    
    switch (frequency) {
      case 'weekly':
        dueDate.setDate(dueDate.getDate() + (installmentIndex * 7));
        break;
      case 'biweekly':
        dueDate.setDate(dueDate.getDate() + (installmentIndex * 14));
        break;
      case 'monthly':
        dueDate.setMonth(dueDate.getMonth() + installmentIndex);
        break;
    }
    
    return dueDate;
  }

  private async updateOverdueInstallments(): Promise<void> {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Final del día
    
    const overdueCount = Array.from(this.installments.values())
      .filter(installment => {
        const isOverdue = installment.status === 'pending' && installment.dueDate < today;
        if (isOverdue) {
          installment.status = 'overdue';
          this.saveInstallment(installment);
        }
        return isOverdue;
      }).length;

    if (overdueCount > 0) {
      console.log(`${overdueCount} cuotas marcadas como vencidas`);
      await this.saveInstallmentsToStorage();
    }
  }

  private async checkPlanCompletion(planId: string): Promise<void> {
    const plan = this.paymentPlans.get(planId);
    if (!plan || plan.status !== 'active') return;

    const planInstallments = await this.getPlanInstallments(planId);
    const allPaid = planInstallments.every(installment => installment.status === 'paid');

    if (allPaid) {
      const completedPlan: PaymentPlan = {
        ...plan,
        status: 'completed',
        updated: new Date()
      };

      this.paymentPlans.set(planId, completedPlan);
      await this.savePaymentPlan(completedPlan);
      await this.savePaymentPlansToStorage();

      console.log(`Plan de pago ${planId} completado`);
    }
  }

  private validatePaymentPlanData(data: {
    customerId: string;
    totalAmount: number;
    installments: number;
    frequency: string;
    description: string;
  }): void {
    if (!data.customerId || data.customerId.trim() === '') {
      throw new Error('ID de cliente es requerido');
    }

    if (typeof data.totalAmount !== 'number' || data.totalAmount <= 0) {
      throw new Error('Monto total debe ser un número positivo');
    }

    if (typeof data.installments !== 'number' || data.installments <= 0 || data.installments > 60) {
      throw new Error('Cantidad de cuotas debe ser entre 1 y 60');
    }

    if (!['weekly', 'biweekly', 'monthly'].includes(data.frequency)) {
      throw new Error('Frecuencia inválida');
    }

    if (!data.description || data.description.trim() === '') {
      throw new Error('Descripción es requerida');
    }
  }

  private async savePaymentPlan(plan: PaymentPlan): Promise<void> {
    try {
      await offlineStorage.set('payment_plans', plan.id, plan, false);
      
      if (!navigator.onLine) {
        await offlineStorage.addToSyncQueue('update', 'payment_plans', plan, plan.id);
      }
    } catch (error) {
      console.error('Error guardando plan de pago:', error);
    }
  }

  private async saveInstallment(installment: PaymentPlanInstallment): Promise<void> {
    try {
      await offlineStorage.set('payment_installments', installment.id, installment, false);
      
      if (!navigator.onLine) {
        await offlineStorage.addToSyncQueue('update', 'payment_installments', installment, installment.id);
      }
    } catch (error) {
      console.error('Error guardando cuota:', error);
    }
  }

  private async savePaymentPlansToStorage(): Promise<void> {
    try {
      const plansArray = Array.from(this.paymentPlans.values());
      this.storage.save('plans', plansArray);
    } catch (error) {
      console.error('Error guardando planes en localStorage:', error);
    }
  }

  private async saveInstallmentsToStorage(): Promise<void> {
    try {
      const installmentsArray = Array.from(this.installments.values());
      this.storage.save('installments', installmentsArray);
    } catch (error) {
      console.error('Error guardando cuotas en localStorage:', error);
    }
  }

  private generatePlanId(): string {
    return `plan_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateInstallmentId(): string {
    return `inst_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}