// Exportaciones principales del módulo de clientes
export { CustomersModule } from './customers.module';
export type { 
  FiadoTransaction, 
  CustomerExtended, 
  LoyaltyRule, 
  LoyaltyRedemption,
  CustomersModuleEvents 
} from './customers.module';
export { CustomersEvents } from './customers.module';

// Servicios
export { CustomersManager } from './services/customers-manager';
export { FiadoManager } from './services/fiado-manager';
export { PaymentsManager } from './services/payments-manager';
export type { PaymentPlan, PaymentPlanInstallment } from './services/payments-manager';
export { LoyaltyManager } from './services/loyalty-manager';