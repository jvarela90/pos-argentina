import { v4 as uuid } from 'uuid';

/**
 * Utilidades comunes para todos los módulos
 */

/**
 * Genera ID único
 */
export const generateId = (): string => uuid();

/**
 * Formatea precios en pesos argentinos
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2
  }).format(amount);
};

/**
 * Formatea fecha en formato argentino
 */
export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

/**
 * Valida CUIT argentino
 */
export const validateCuit = (cuit: string): boolean => {
  if (!cuit || cuit.length !== 11) return false;
  
  const cleanCuit = cuit.replace(/[^0-9]/g, '');
  if (cleanCuit.length !== 11) return false;

  const digits = cleanCuit.split('').map(Number);
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += digits[i] * weights[i];
  }
  
  const remainder = sum % 11;
  const checkDigit = remainder < 2 ? remainder : 11 - remainder;
  
  return checkDigit === digits[10];
};

/**
 * Valida DNI argentino
 */
export const validateDni = (dni: string): boolean => {
  if (!dni) return false;
  const cleanDni = dni.replace(/[^0-9]/g, '');
  return cleanDni.length >= 7 && cleanDni.length <= 8;
};

/**
 * Calcula dígito verificador para códigos de barras
 */
export const calculateBarcodeCheckDigit = (barcode: string): string => {
  if (barcode.length !== 12) return '';
  
  const digits = barcode.split('').map(Number);
  let oddSum = 0;
  let evenSum = 0;
  
  for (let i = 0; i < 12; i++) {
    if (i % 2 === 0) {
      oddSum += digits[i];
    } else {
      evenSum += digits[i];
    }
  }
  
  const total = oddSum + (evenSum * 3);
  const checkDigit = (10 - (total % 10)) % 10;
  
  return checkDigit.toString();
};

/**
 * Debounce para optimizar búsquedas
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

/**
 * Throttle para limitar frecuencia de ejecución
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func.apply(null, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Clonado profundo de objetos
 */
export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as unknown as T;
  if (typeof obj === 'object') {
    const clonedObj = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
  return obj;
};

/**
 * Calcula porcentaje de impuestos (IVA estándar en Argentina: 21%)
 */
export const calculateTax = (amount: number, taxRate: number = 21): number => {
  return Math.round((amount * taxRate / 100) * 100) / 100;
};

/**
 * Calcula precio sin impuestos
 */
export const calculateNetPrice = (grossPrice: number, taxRate: number = 21): number => {
  return Math.round((grossPrice / (1 + taxRate / 100)) * 100) / 100;
};

/**
 * Redondea a centavos (útil para precios)
 */
export const roundToCents = (amount: number): number => {
  return Math.round(amount * 100) / 100;
};

/**
 * Convierte string a slug (útil para URLs y IDs)
 */
export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quitar acentos
    .replace(/[^a-z0-9 -]/g, '') // quitar caracteres especiales
    .replace(/\s+/g, '-') // espacios a guiones
    .replace(/-+/g, '-') // múltiples guiones a uno
    .trim();
};

/**
 * Valida email
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Formatea teléfono argentino
 */
export const formatPhoneNumber = (phone: string): string => {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  
  if (cleanPhone.length === 10) {
    // Celular: 11 1234 5678
    return `${cleanPhone.slice(0, 2)} ${cleanPhone.slice(2, 6)} ${cleanPhone.slice(6)}`;
  } else if (cleanPhone.length === 8) {
    // Fijo: 4123 4567
    return `${cleanPhone.slice(0, 4)} ${cleanPhone.slice(4)}`;
  }
  
  return phone;
};

/**
 * Genera código QR para pagos (formato simple)
 */
export const generatePaymentQR = (amount: number, description: string, merchantId: string): string => {
  const data = {
    amount: amount.toString(),
    description,
    merchant_id: merchantId,
    timestamp: Date.now()
  };
  
  return btoa(JSON.stringify(data));
};