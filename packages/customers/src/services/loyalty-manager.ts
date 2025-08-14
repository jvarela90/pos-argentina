import { StorageManager, offlineStorage } from '@pos-argentina/shared';
import { LoyaltyRule, LoyaltyRedemption } from '../customers.module';

export class LoyaltyManager {
  private storage: StorageManager;
  private rules: Map<string, LoyaltyRule> = new Map();
  private redemptions: Map<string, LoyaltyRedemption> = new Map();

  // Configuración por defecto del sistema de lealtad
  private defaultPointsPerPeso = 0.1; // 1 punto cada 10 pesos
  private pointsToMoneyRatio = 100; // 100 puntos = 1 peso

  constructor() {
    this.storage = new StorageManager('loyalty_system');
  }

  async initialize(): Promise<void> {
    console.log('Inicializando sistema de fidelización...');
    await this.loadRules();
    await this.loadRedemptions();
    await this.createDefaultRules();
  }

  async activate(): Promise<void> {
    await this.loadRules();
    await this.loadRedemptions();
    console.log(`Sistema de fidelización activado con ${this.rules.size} reglas`);
  }

  async deactivate(): Promise<void> {
    console.log('Sistema de fidelización desactivado');
  }

  async cleanup(): Promise<void> {
    this.rules.clear();
    this.redemptions.clear();
    console.log('Sistema de fidelización limpiado');
  }

  private async loadRules(): Promise<void> {
    try {
      // Cargar desde offline storage primero
      const offlineRules = await offlineStorage.getAll<LoyaltyRule>('loyalty_rules');
      
      // Si no hay reglas offline, cargar desde localStorage
      if (offlineRules.length === 0) {
        const localRules = this.storage.load<LoyaltyRule[]>('rules') || [];
        
        // Migrar a offline storage
        for (const rule of localRules) {
          await offlineStorage.set('loyalty_rules', rule.id, rule, true);
        }
        
        localRules.forEach(rule => {
          this.rules.set(rule.id, rule);
        });
      } else {
        offlineRules.forEach(rule => {
          this.rules.set(rule.id, rule);
        });
      }
    } catch (error) {
      console.error('Error cargando reglas de lealtad:', error);
    }
  }

  private async loadRedemptions(): Promise<void> {
    try {
      // Cargar desde offline storage primero
      const offlineRedemptions = await offlineStorage.getAll<LoyaltyRedemption>('loyalty_redemptions');
      
      // Si no hay canjes offline, cargar desde localStorage
      if (offlineRedemptions.length === 0) {
        const localRedemptions = this.storage.load<LoyaltyRedemption[]>('redemptions') || [];
        
        // Migrar a offline storage
        for (const redemption of localRedemptions) {
          await offlineStorage.set('loyalty_redemptions', redemption.id, redemption, true);
        }
        
        localRedemptions.forEach(redemption => {
          this.redemptions.set(redemption.id, redemption);
        });
      } else {
        offlineRedemptions.forEach(redemption => {
          this.redemptions.set(redemption.id, redemption);
        });
      }
    } catch (error) {
      console.error('Error cargando canjes de lealtad:', error);
    }
  }

  private async createDefaultRules(): Promise<void> {
    // Si no hay reglas, crear las reglas por defecto
    if (this.rules.size === 0) {
      const defaultRules: Omit<LoyaltyRule, 'id'>[] = [
        {
          name: 'Puntos Base',
          type: 'points_per_peso',
          value: this.defaultPointsPerPeso,
          active: true,
          validFrom: new Date()
        },
        {
          name: 'Bonus Compra Grande',
          type: 'bonus_points',
          value: 500,
          minAmount: 10000,
          active: true,
          validFrom: new Date()
        },
        {
          name: 'Multiplicador Bebidas',
          type: 'multiplier',
          value: 2,
          category: 'Bebidas',
          active: true,
          validFrom: new Date()
        },
        {
          name: 'Multiplicador Fin de Semana',
          type: 'multiplier',
          value: 1.5,
          active: false, // Activar manualmente cuando sea necesario
          validFrom: new Date()
        }
      ];

      for (const ruleData of defaultRules) {
        await this.addRule(ruleData);
      }

      console.log(`Creadas ${defaultRules.length} reglas de lealtad por defecto`);
    }
  }

  async earnPoints(customerId: string, saleAmount: number, saleId: string): Promise<number> {
    if (saleAmount <= 0) return 0;

    let totalPoints = 0;
    const activeRules = this.getActiveRules();

    // Aplicar reglas en orden de prioridad
    for (const rule of activeRules) {
      if (this.isRuleApplicable(rule, saleAmount)) {
        const points = this.calculatePoints(rule, saleAmount);
        totalPoints += points;
        
        console.log(`Regla "${rule.name}" aplicada: +${points} puntos`);
      }
    }

    // Redondear puntos
    totalPoints = Math.floor(totalPoints);

    if (totalPoints > 0) {
      console.log(`Cliente ${customerId} ganó ${totalPoints} puntos por venta de $${saleAmount}`);
    }

    return totalPoints;
  }

  async redeemPoints(customerId: string, pointsToRedeem: number, saleId: string, userId: string): Promise<LoyaltyRedemption> {
    if (pointsToRedeem <= 0) {
      throw new Error('Cantidad de puntos debe ser positiva');
    }

    // Calcular descuento en pesos
    const discountAmount = this.calculateDiscountFromPoints(pointsToRedeem);

    const redemption: LoyaltyRedemption = {
      id: this.generateRedemptionId(),
      customerId,
      pointsUsed: pointsToRedeem,
      discountAmount,
      saleId,
      userId,
      date: new Date()
    };

    this.redemptions.set(redemption.id, redemption);
    
    await this.saveRedemption(redemption);
    await this.saveRedemptionsToStorage();

    console.log(`${pointsToRedeem} puntos canjeados por $${discountAmount} de descuento`);
    
    return redemption;
  }

  async addRule(ruleData: Omit<LoyaltyRule, 'id'>): Promise<LoyaltyRule> {
    // Validar datos de la regla
    this.validateRuleData(ruleData);

    const rule: LoyaltyRule = {
      ...ruleData,
      id: this.generateRuleId()
    };

    this.rules.set(rule.id, rule);
    
    await this.saveRule(rule);
    await this.saveRulesToStorage();

    console.log(`Nueva regla de lealtad creada: ${rule.name}`);
    
    return rule;
  }

  async updateRule(id: string, updates: Partial<LoyaltyRule>): Promise<LoyaltyRule | null> {
    const rule = this.rules.get(id);
    if (!rule) return null;

    const updatedRule: LoyaltyRule = {
      ...rule,
      ...updates,
      id: rule.id // Asegurar que no se cambie el ID
    };

    // Validar regla actualizada
    this.validateRuleData(updatedRule);

    this.rules.set(id, updatedRule);
    
    await this.saveRule(updatedRule);
    await this.saveRulesToStorage();

    return updatedRule;
  }

  async deleteRule(id: string): Promise<boolean> {
    if (!this.rules.has(id)) return false;

    this.rules.delete(id);
    
    await offlineStorage.delete('loyalty_rules', id);
    await this.saveRulesToStorage();

    return true;
  }

  async getRules(): Promise<LoyaltyRule[]> {
    return Array.from(this.rules.values())
      .sort((a, b) => {
        // Ordenar por activas primero, luego por fecha
        if (a.active && !b.active) return -1;
        if (!a.active && b.active) return 1;
        return b.validFrom.getTime() - a.validFrom.getTime();
      });
  }

  async getActiveRules(): Promise<LoyaltyRule[]> {
    const now = new Date();
    
    return Array.from(this.rules.values())
      .filter(rule => 
        rule.active && 
        rule.validFrom <= now && 
        (!rule.validTo || rule.validTo >= now)
      )
      .sort((a, b) => {
        // Ordenar por tipo: puntos base primero, luego bonus, luego multiplicadores
        const typeOrder = { points_per_peso: 1, bonus_points: 2, multiplier: 3 };
        return typeOrder[a.type] - typeOrder[b.type];
      });
  }

  async getCustomerRedemptions(customerId: string): Promise<LoyaltyRedemption[]> {
    return Array.from(this.redemptions.values())
      .filter(redemption => redemption.customerId === customerId)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  async getLoyaltyStats(): Promise<{
    totalRules: number;
    activeRules: number;
    totalRedemptions: number;
    totalPointsRedeemed: number;
    totalDiscountGiven: number;
    averageRedemption: number;
  }> {
    const rules = Array.from(this.rules.values());
    const redemptions = Array.from(this.redemptions.values());
    const activeRules = rules.filter(r => r.active);

    const totalPointsRedeemed = redemptions.reduce((sum, r) => sum + r.pointsUsed, 0);
    const totalDiscountGiven = redemptions.reduce((sum, r) => sum + r.discountAmount, 0);
    const averageRedemption = redemptions.length > 0 ? totalDiscountGiven / redemptions.length : 0;

    return {
      totalRules: rules.length,
      activeRules: activeRules.length,
      totalRedemptions: redemptions.length,
      totalPointsRedeemed,
      totalDiscountGiven: Math.round(totalDiscountGiven * 100) / 100,
      averageRedemption: Math.round(averageRedemption * 100) / 100
    };
  }

  calculateDiscountFromPoints(points: number): number {
    return Math.round((points / this.pointsToMoneyRatio) * 100) / 100;
  }

  calculatePointsFromDiscount(discountAmount: number): number {
    return Math.floor(discountAmount * this.pointsToMoneyRatio);
  }

  private getActiveRules(): LoyaltyRule[] {
    const now = new Date();
    
    return Array.from(this.rules.values())
      .filter(rule => 
        rule.active && 
        rule.validFrom <= now && 
        (!rule.validTo || rule.validTo >= now)
      )
      .sort((a, b) => {
        const typeOrder = { points_per_peso: 1, bonus_points: 2, multiplier: 3 };
        return typeOrder[a.type] - typeOrder[b.type];
      });
  }

  private isRuleApplicable(rule: LoyaltyRule, saleAmount: number): boolean {
    // Verificar monto mínimo
    if (rule.minAmount && saleAmount < rule.minAmount) {
      return false;
    }

    // Las reglas de categoría se manejarían con información adicional de la venta
    // Por ahora, aplicamos todas las reglas activas

    return true;
  }

  private calculatePoints(rule: LoyaltyRule, saleAmount: number): number {
    switch (rule.type) {
      case 'points_per_peso':
        return saleAmount * rule.value;
      
      case 'bonus_points':
        return rule.value;
      
      case 'multiplier':
        // Para multiplicadores, necesitaríamos los puntos base calculados
        // Como simplificación, aplicamos el multiplicador al monto
        return saleAmount * this.defaultPointsPerPeso * (rule.value - 1);
      
      default:
        return 0;
    }
  }

  private validateRuleData(data: Partial<LoyaltyRule>): void {
    if (!data.name || data.name.trim() === '') {
      throw new Error('Nombre de la regla es requerido');
    }

    if (!data.type || !['points_per_peso', 'bonus_points', 'multiplier'].includes(data.type)) {
      throw new Error('Tipo de regla inválido');
    }

    if (typeof data.value !== 'number' || data.value <= 0) {
      throw new Error('Valor de la regla debe ser un número positivo');
    }

    if (data.minAmount !== undefined && (typeof data.minAmount !== 'number' || data.minAmount < 0)) {
      throw new Error('Monto mínimo debe ser un número no negativo');
    }

    if (!data.validFrom) {
      throw new Error('Fecha de inicio es requerida');
    }

    if (data.validTo && data.validTo <= data.validFrom) {
      throw new Error('Fecha de fin debe ser posterior a la fecha de inicio');
    }
  }

  private async saveRule(rule: LoyaltyRule): Promise<void> {
    try {
      await offlineStorage.set('loyalty_rules', rule.id, rule, false);
      
      if (!navigator.onLine) {
        await offlineStorage.addToSyncQueue('update', 'loyalty_rules', rule, rule.id);
      }
    } catch (error) {
      console.error('Error guardando regla de lealtad:', error);
    }
  }

  private async saveRedemption(redemption: LoyaltyRedemption): Promise<void> {
    try {
      await offlineStorage.set('loyalty_redemptions', redemption.id, redemption, false);
      
      if (!navigator.onLine) {
        await offlineStorage.addToSyncQueue('create', 'loyalty_redemptions', redemption, redemption.id);
      }
    } catch (error) {
      console.error('Error guardando canje de lealtad:', error);
    }
  }

  private async saveRulesToStorage(): Promise<void> {
    try {
      const rulesArray = Array.from(this.rules.values());
      this.storage.save('rules', rulesArray);
    } catch (error) {
      console.error('Error guardando reglas en localStorage:', error);
    }
  }

  private async saveRedemptionsToStorage(): Promise<void> {
    try {
      const redemptionsArray = Array.from(this.redemptions.values());
      this.storage.save('redemptions', redemptionsArray);
    } catch (error) {
      console.error('Error guardando canjes en localStorage:', error);
    }
  }

  private generateRuleId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateRedemptionId(): string {
    return `redeem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}