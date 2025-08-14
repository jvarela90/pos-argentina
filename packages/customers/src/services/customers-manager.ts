import { StorageManager, offlineStorage } from '@pos-argentina/shared';
import { CustomerExtended } from '../customers.module';

export class CustomersManager {
  private storage: StorageManager;
  private customers: Map<string, CustomerExtended> = new Map();

  constructor() {
    this.storage = new StorageManager('customers');
  }

  async initialize(): Promise<void> {
    console.log('Inicializando gestor de clientes...');
    await this.loadCustomers();
  }

  async activate(): Promise<void> {
    await this.loadCustomers();
    console.log(`Gestor de clientes activado con ${this.customers.size} clientes`);
  }

  async deactivate(): Promise<void> {
    console.log('Gestor de clientes desactivado');
  }

  async cleanup(): Promise<void> {
    this.customers.clear();
    console.log('Clientes limpiados');
  }

  private async loadCustomers(): Promise<void> {
    try {
      // Cargar desde offline storage primero
      const offlineCustomers = await offlineStorage.getAll<CustomerExtended>('customers');
      
      // Si no hay clientes offline, cargar desde localStorage
      if (offlineCustomers.length === 0) {
        const localCustomers = this.storage.load<CustomerExtended[]>('customers') || [];
        
        // Migrar a offline storage
        for (const customer of localCustomers) {
          await offlineStorage.set('customers', customer.id, customer, true);
        }
        
        localCustomers.forEach(customer => {
          this.customers.set(customer.id, customer);
        });
      } else {
        offlineCustomers.forEach(customer => {
          this.customers.set(customer.id, customer);
        });
      }

      // Si no hay clientes, crear algunos de ejemplo
      if (this.customers.size === 0) {
        await this.createSampleCustomers();
      }
    } catch (error) {
      console.error('Error cargando clientes:', error);
      await this.createSampleCustomers();
    }
  }

  private async createSampleCustomers(): Promise<void> {
    const sampleCustomers: Omit<CustomerExtended, 'id' | 'created' | 'updated' | 'fiadoBalance' | 'loyaltyPoints' | 'lastVisit' | 'totalPurchases' | 'averageTicket'>[] = [
      {
        name: 'María González',
        email: 'maria.gonzalez@email.com',
        phone: '11-4567-8901',
        address: 'Av. Rivadavia 1234, CABA',
        dni: '12345678',
        fiadoLimit: 50000,
        status: 'active'
      },
      {
        name: 'Carlos Fernández',
        email: 'carlos.fernandez@email.com',
        phone: '11-2345-6789',
        address: 'Corrientes 567, CABA',
        dni: '23456789',
        fiadoLimit: 30000,
        status: 'active'
      },
      {
        name: 'Ana Martínez',
        email: 'ana.martinez@email.com',
        phone: '11-3456-7890',
        address: 'San Martín 890, CABA',
        dni: '34567890',
        fiadoLimit: 75000,
        status: 'active'
      },
      {
        name: 'Roberto Silva',
        email: 'roberto.silva@email.com',
        phone: '11-4567-8901',
        address: 'Belgrano 456, CABA',
        dni: '45678901',
        fiadoLimit: 40000,
        status: 'active'
      }
    ];

    for (const customerData of sampleCustomers) {
      await this.addCustomer(customerData);
    }

    console.log(`Creados ${sampleCustomers.length} clientes de ejemplo`);
  }

  async addCustomer(customerData: Omit<CustomerExtended, 'id' | 'created' | 'updated' | 'fiadoBalance' | 'loyaltyPoints' | 'lastVisit' | 'totalPurchases' | 'averageTicket'>): Promise<CustomerExtended> {
    // Validar datos del cliente
    this.validateCustomerData(customerData);

    // Verificar que no existe otro cliente con el mismo DNI/email/teléfono
    await this.checkDuplicateCustomer(customerData);

    const customer: CustomerExtended = {
      ...customerData,
      id: this.generateCustomerId(),
      fiadoBalance: 0,
      loyaltyPoints: 0,
      lastVisit: null,
      totalPurchases: 0,
      averageTicket: 0,
      created: new Date(),
      updated: new Date()
    };

    this.customers.set(customer.id, customer);
    
    await this.saveCustomer(customer);
    await this.saveCustomersToStorage();

    return customer;
  }

  async updateCustomer(id: string, updates: Partial<CustomerExtended>): Promise<CustomerExtended | null> {
    const customer = this.customers.get(id);
    if (!customer) return null;

    // Si se actualiza email, DNI o teléfono, verificar duplicados
    if (updates.email && updates.email !== customer.email) {
      const existingByEmail = await this.getCustomerByEmail(updates.email);
      if (existingByEmail && existingByEmail.id !== id) {
        throw new Error('Ya existe un cliente con este email');
      }
    }

    if (updates.dni && updates.dni !== customer.dni) {
      const existingByDni = await this.getCustomerByDni(updates.dni);
      if (existingByDni && existingByDni.id !== id) {
        throw new Error('Ya existe un cliente con este DNI');
      }
    }

    if (updates.phone && updates.phone !== customer.phone) {
      const existingByPhone = await this.getCustomerByPhone(updates.phone);
      if (existingByPhone && existingByPhone.id !== id) {
        throw new Error('Ya existe un cliente con este teléfono');
      }
    }

    const updatedCustomer: CustomerExtended = {
      ...customer,
      ...updates,
      id: customer.id, // Asegurar que no se cambie el ID
      created: customer.created, // Mantener fecha de creación
      updated: new Date()
    };

    this.customers.set(id, updatedCustomer);
    
    await this.saveCustomer(updatedCustomer);
    await this.saveCustomersToStorage();

    return updatedCustomer;
  }

  async deleteCustomer(id: string): Promise<boolean> {
    const customer = this.customers.get(id);
    if (!customer) return false;

    // Verificar que no tenga deudas pendientes
    if (customer.fiadoBalance > 0) {
      throw new Error('No se puede eliminar un cliente con deudas pendientes');
    }

    this.customers.delete(id);
    
    await offlineStorage.delete('customers', id);
    await this.saveCustomersToStorage();

    return true;
  }

  async getCustomer(id: string): Promise<CustomerExtended | null> {
    return this.customers.get(id) || null;
  }

  async getAllCustomers(): Promise<CustomerExtended[]> {
    return Array.from(this.customers.values())
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async getActiveCustomers(): Promise<CustomerExtended[]> {
    return Array.from(this.customers.values())
      .filter(customer => customer.status === 'active')
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async getCustomersWithDebt(): Promise<CustomerExtended[]> {
    return Array.from(this.customers.values())
      .filter(customer => customer.fiadoBalance > 0)
      .sort((a, b) => b.fiadoBalance - a.fiadoBalance);
  }

  async getCustomerByEmail(email: string): Promise<CustomerExtended | null> {
    for (const customer of this.customers.values()) {
      if (customer.email?.toLowerCase() === email.toLowerCase()) {
        return customer;
      }
    }
    return null;
  }

  async getCustomerByPhone(phone: string): Promise<CustomerExtended | null> {
    // Normalizar número de teléfono para comparación
    const normalizedPhone = this.normalizePhone(phone);
    
    for (const customer of this.customers.values()) {
      if (customer.phone && this.normalizePhone(customer.phone) === normalizedPhone) {
        return customer;
      }
    }
    return null;
  }

  async getCustomerByDni(dni: string): Promise<CustomerExtended | null> {
    for (const customer of this.customers.values()) {
      if (customer.dni === dni) {
        return customer;
      }
    }
    return null;
  }

  async searchCustomers(query: string): Promise<CustomerExtended[]> {
    const searchTerm = query.toLowerCase().trim();
    
    return Array.from(this.customers.values())
      .filter(customer => 
        customer.name.toLowerCase().includes(searchTerm) ||
        (customer.email && customer.email.toLowerCase().includes(searchTerm)) ||
        (customer.phone && customer.phone.includes(searchTerm)) ||
        (customer.dni && customer.dni.includes(searchTerm)) ||
        (customer.address && customer.address.toLowerCase().includes(searchTerm))
      )
      .sort((a, b) => {
        // Priorizar coincidencias exactas en nombre
        const aNameMatch = a.name.toLowerCase().startsWith(searchTerm);
        const bNameMatch = b.name.toLowerCase().startsWith(searchTerm);
        
        if (aNameMatch && !bNameMatch) return -1;
        if (!aNameMatch && bNameMatch) return 1;
        
        return a.name.localeCompare(b.name);
      });
  }

  async updateCustomerStats(customerId: string, saleAmount: number): Promise<void> {
    const customer = this.customers.get(customerId);
    if (!customer) return;

    const newTotalPurchases = customer.totalPurchases + 1;
    const newAverageTicket = ((customer.averageTicket * customer.totalPurchases) + saleAmount) / newTotalPurchases;

    await this.updateCustomer(customerId, {
      lastVisit: new Date(),
      totalPurchases: newTotalPurchases,
      averageTicket: Math.round(newAverageTicket * 100) / 100 // Redondear a 2 decimales
    });
  }

  async activateCustomer(id: string): Promise<boolean> {
    return (await this.updateCustomer(id, { status: 'active' })) !== null;
  }

  async deactivateCustomer(id: string): Promise<boolean> {
    return (await this.updateCustomer(id, { status: 'inactive' })) !== null;
  }

  async blockCustomer(id: string): Promise<boolean> {
    return (await this.updateCustomer(id, { status: 'blocked' })) !== null;
  }

  async generateReport(): Promise<{
    totalCustomers: number;
    activeCustomers: number;
    customersWithDebt: number;
    totalDebt: number;
    averageDebt: number;
    totalLoyaltyPoints: number;
  }> {
    const customers = Array.from(this.customers.values());
    const activeCustomers = customers.filter(c => c.status === 'active');
    const customersWithDebt = customers.filter(c => c.fiadoBalance > 0);
    
    const totalDebt = customers.reduce((sum, c) => sum + c.fiadoBalance, 0);
    const averageDebt = customersWithDebt.length > 0 ? totalDebt / customersWithDebt.length : 0;
    const totalLoyaltyPoints = customers.reduce((sum, c) => sum + c.loyaltyPoints, 0);

    return {
      totalCustomers: customers.length,
      activeCustomers: activeCustomers.length,
      customersWithDebt: customersWithDebt.length,
      totalDebt: Math.round(totalDebt * 100) / 100,
      averageDebt: Math.round(averageDebt * 100) / 100,
      totalLoyaltyPoints
    };
  }

  private validateCustomerData(data: any): void {
    if (!data.name || data.name.trim() === '') {
      throw new Error('Nombre del cliente es requerido');
    }

    if (data.email && !this.isValidEmail(data.email)) {
      throw new Error('Email inválido');
    }

    if (data.phone && !this.isValidPhone(data.phone)) {
      throw new Error('Teléfono inválido');
    }

    if (data.dni && !this.isValidDni(data.dni)) {
      throw new Error('DNI inválido');
    }

    if (data.fiadoLimit !== undefined && (typeof data.fiadoLimit !== 'number' || data.fiadoLimit < 0)) {
      throw new Error('Límite de fiado debe ser un número no negativo');
    }
  }

  private async checkDuplicateCustomer(data: any): Promise<void> {
    if (data.email) {
      const existingByEmail = await this.getCustomerByEmail(data.email);
      if (existingByEmail) {
        throw new Error('Ya existe un cliente con este email');
      }
    }

    if (data.dni) {
      const existingByDni = await this.getCustomerByDni(data.dni);
      if (existingByDni) {
        throw new Error('Ya existe un cliente con este DNI');
      }
    }

    if (data.phone) {
      const existingByPhone = await this.getCustomerByPhone(data.phone);
      if (existingByPhone) {
        throw new Error('Ya existe un cliente con este teléfono');
      }
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhone(phone: string): boolean {
    // Validar formato argentino: puede tener 11, 15, etc. con/sin guiones/espacios
    const cleanPhone = phone.replace(/[\s-]/g, '');
    return /^\d{8,15}$/.test(cleanPhone);
  }

  private isValidDni(dni: string): boolean {
    // DNI argentino: 7-8 dígitos
    return /^\d{7,8}$/.test(dni);
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/[\s-\(\)]/g, '');
  }

  private async saveCustomer(customer: CustomerExtended): Promise<void> {
    try {
      // Guardar en offline storage
      await offlineStorage.set('customers', customer.id, customer, false);
      
      // Agregar a cola de sincronización si está offline
      if (!navigator.onLine) {
        await offlineStorage.addToSyncQueue('update', 'customers', customer, customer.id);
      }
    } catch (error) {
      console.error('Error guardando cliente:', error);
    }
  }

  private async saveCustomersToStorage(): Promise<void> {
    try {
      const customersArray = Array.from(this.customers.values());
      this.storage.save('customers', customersArray);
    } catch (error) {
      console.error('Error guardando clientes en localStorage:', error);
    }
  }

  private generateCustomerId(): string {
    return `cust_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}