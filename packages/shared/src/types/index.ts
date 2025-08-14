// Tipos base del sistema
export interface ModuleConfig {
  id: string;
  name: string;
  version: string;
  dependencies: string[];
  optional: boolean;
  price: number;
  trialDays: number;
  description: string;
}

export interface SaleItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  tax: number;
  discount: number;
  category?: string;
  barcode?: string;
}

export interface Sale {
  id: string;
  items: SaleItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  customerId?: string;
  customerName?: string;
  timestamp: Date;
  status: 'pending' | 'completed' | 'cancelled' | 'refunded';
  receiptNumber?: string;
  fiscalData?: FiscalData;
}

export interface Customer {
  id: string;
  name: string;
  dni?: string;
  phone?: string;
  email?: string;
  address?: string;
  creditLimit: number;
  currentDebt: number;
  created: Date;
  lastPurchase?: Date;
  transactions: CustomerTransaction[];
}

export interface CustomerTransaction {
  id: string;
  date: Date;
  amount: number;
  type: 'credit' | 'payment' | 'purchase';
  description: string;
  saleId?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  cost?: number;
  category: string;
  barcode?: string;
  description?: string;
  stock: number;
  minStock: number;
  tax: number;
  active: boolean;
  image?: string;
  created: Date;
  updated: Date;
}

export type PaymentMethod = 
  | 'cash'
  | 'credit_card'
  | 'debit_card' 
  | 'mercadopago'
  | 'modo'
  | 'qr'
  | 'account_credit'
  | 'mixed';

export interface PaymentData {
  method: PaymentMethod;
  amount: number;
  customerId?: string;
  reference?: string;
  installments?: number;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  authCode?: string;
  error?: string;
  change?: number;
}

export interface FiscalData {
  cae?: string;
  caeExpiration?: Date;
  invoiceType: 'A' | 'B' | 'C';
  invoiceNumber?: string;
  customerCuit?: string;
  customerCondition?: 'RI' | 'CF' | 'EX';
}

export interface StoreConfig {
  id: string;
  name: string;
  cuit?: string;
  address: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  fiscalCondition: 'RI' | 'RM' | 'CF' | 'EX';
  currency: string;
  timezone: string;
  modules: string[];
}

export interface DomainEvent {
  id: string;
  type: string;
  moduleId: string;
  data: any;
  timestamp: Date;
  version: number;
}