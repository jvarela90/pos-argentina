import { StorageManager, offlineStorage } from '@pos-argentina/shared';
import { Supplier } from '../inventory.module';

export class SupplierManager {
  private storage: StorageManager;
  private suppliers: Map<string, Supplier> = new Map();

  constructor() {
    this.storage = new StorageManager('suppliers');
  }

  async initialize(): Promise<void> {
    console.log('Inicializando gestor de proveedores...');
    await this.loadSuppliers();
  }

  async activate(): Promise<void> {
    await this.loadSuppliers();
    console.log(`Gestión de proveedores activada con ${this.suppliers.size} proveedores`);
  }

  async deactivate(): Promise<void> {
    console.log('Gestión de proveedores desactivada');
  }

  async cleanup(): Promise<void> {
    this.suppliers.clear();
    console.log('Proveedores limpiados');
  }

  private async loadSuppliers(): Promise<void> {
    try {
      // Cargar desde offline storage primero
      const offlineSuppliers = await offlineStorage.getAll<Supplier>('suppliers');
      
      // Si no hay proveedores offline, cargar desde localStorage
      if (offlineSuppliers.length === 0) {
        const localSuppliers = this.storage.load<Supplier[]>('suppliers') || [];
        
        // Migrar a offline storage
        for (const supplier of localSuppliers) {
          await offlineStorage.set('suppliers', supplier.id, supplier, true);
        }
        
        localSuppliers.forEach(supplier => {
          this.suppliers.set(supplier.id, supplier);
        });
      } else {
        offlineSuppliers.forEach(supplier => {
          this.suppliers.set(supplier.id, supplier);
        });
      }

      // Si no hay proveedores, crear algunos de ejemplo
      if (this.suppliers.size === 0) {
        await this.createSampleSuppliers();
      }
    } catch (error) {
      console.error('Error cargando proveedores:', error);
      await this.createSampleSuppliers();
    }
  }

  private async createSampleSuppliers(): Promise<void> {
    const sampleSuppliers: Omit<Supplier, 'id' | 'created' | 'updated'>[] = [
      {
        name: 'Distribuidora La Serenísima S.A.',
        cuit: '30-50001234-5',
        address: 'Av. Corrientes 1234, CABA',
        phone: '011-4567-8900',
        email: 'ventas@laserenisima.com.ar',
        contact: 'María González',
        paymentTerms: '30 días',
        active: true
      },
      {
        name: 'Molinos Río de la Plata S.A.',
        cuit: '30-50002345-6',
        address: 'Puerto Madero 567, CABA',
        phone: '011-5678-9012',
        email: 'comercial@molinos.com.ar',
        contact: 'Carlos Fernández',
        paymentTerms: '21 días',
        active: true
      },
      {
        name: 'Arcor S.A.I.C.',
        cuit: '30-50003456-7',
        address: 'Av. Fulton 404, Córdoba',
        phone: '0351-456-7890',
        email: 'ventas@arcor.com',
        contact: 'Ana Martínez',
        paymentTerms: '45 días',
        active: true
      },
      {
        name: 'Distribuidora Regional Norte',
        cuit: '20-12345678-9',
        address: 'Ruta 34 Km 45, Rosario',
        phone: '0341-234-5678',
        email: 'info@drnorte.com.ar',
        contact: 'Roberto Silva',
        paymentTerms: '15 días',
        active: true
      }
    ];

    for (const supplierData of sampleSuppliers) {
      await this.addSupplier(supplierData);
    }

    console.log(`Creados ${sampleSuppliers.length} proveedores de ejemplo`);
  }

  async addSupplier(supplierData: Omit<Supplier, 'id' | 'created' | 'updated'>): Promise<Supplier> {
    // Validar CUIT
    if (!this.isValidCuit(supplierData.cuit)) {
      throw new Error('CUIT inválido');
    }

    // Verificar que no existe otro proveedor con el mismo CUIT
    const existingSupplier = await this.getSupplierByCuit(supplierData.cuit);
    if (existingSupplier) {
      throw new Error('Ya existe un proveedor con este CUIT');
    }

    const supplier: Supplier = {
      ...supplierData,
      id: this.generateSupplierId(),
      created: new Date(),
      updated: new Date()
    };

    this.suppliers.set(supplier.id, supplier);
    
    await this.saveSupplier(supplier);
    await this.saveSuppliersToStorage();

    return supplier;
  }

  async updateSupplier(id: string, updates: Partial<Supplier>): Promise<Supplier | null> {
    const supplier = this.suppliers.get(id);
    if (!supplier) return null;

    // Si se actualiza el CUIT, validarlo
    if (updates.cuit && updates.cuit !== supplier.cuit) {
      if (!this.isValidCuit(updates.cuit)) {
        throw new Error('CUIT inválido');
      }
      
      const existingSupplier = await this.getSupplierByCuit(updates.cuit);
      if (existingSupplier && existingSupplier.id !== id) {
        throw new Error('Ya existe un proveedor con este CUIT');
      }
    }

    const updatedSupplier: Supplier = {
      ...supplier,
      ...updates,
      id: supplier.id, // Asegurar que no se cambie el ID
      created: supplier.created, // Mantener fecha de creación
      updated: new Date()
    };

    this.suppliers.set(id, updatedSupplier);
    
    await this.saveSupplier(updatedSupplier);
    await this.saveSuppliersToStorage();

    return updatedSupplier;
  }

  async deleteSupplier(id: string): Promise<boolean> {
    if (!this.suppliers.has(id)) return false;

    this.suppliers.delete(id);
    
    await offlineStorage.delete('suppliers', id);
    await this.saveSuppliersToStorage();

    return true;
  }

  async getSupplier(id: string): Promise<Supplier | null> {
    return this.suppliers.get(id) || null;
  }

  async getAllSuppliers(): Promise<Supplier[]> {
    return Array.from(this.suppliers.values())
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async getActiveSuppliers(): Promise<Supplier[]> {
    return Array.from(this.suppliers.values())
      .filter(supplier => supplier.active)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async getSupplierByCuit(cuit: string): Promise<Supplier | null> {
    for (const supplier of this.suppliers.values()) {
      if (supplier.cuit === cuit) {
        return supplier;
      }
    }
    return null;
  }

  async searchSuppliers(query: string): Promise<Supplier[]> {
    const searchTerm = query.toLowerCase().trim();
    
    return Array.from(this.suppliers.values())
      .filter(supplier => 
        supplier.name.toLowerCase().includes(searchTerm) ||
        supplier.cuit.includes(searchTerm) ||
        supplier.contact.toLowerCase().includes(searchTerm) ||
        supplier.email.toLowerCase().includes(searchTerm)
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

  async activateSupplier(id: string): Promise<boolean> {
    return (await this.updateSupplier(id, { active: true })) !== null;
  }

  async deactivateSupplier(id: string): Promise<boolean> {
    return (await this.updateSupplier(id, { active: false })) !== null;
  }

  async getSupplierStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    averagePaymentTerms: number;
  }> {
    const suppliers = Array.from(this.suppliers.values());
    const active = suppliers.filter(s => s.active);
    const inactive = suppliers.filter(s => !s.active);
    
    // Calcular promedio de términos de pago
    const paymentTermsNumbers = suppliers
      .map(s => parseInt(s.paymentTerms.match(/\d+/)?.[0] || '0'))
      .filter(n => n > 0);
    
    const averagePaymentTerms = paymentTermsNumbers.length > 0
      ? paymentTermsNumbers.reduce((sum, n) => sum + n, 0) / paymentTermsNumbers.length
      : 0;

    return {
      total: suppliers.length,
      active: active.length,
      inactive: inactive.length,
      averagePaymentTerms: Math.round(averagePaymentTerms)
    };
  }

  private async saveSupplier(supplier: Supplier): Promise<void> {
    try {
      // Guardar en offline storage
      await offlineStorage.set('suppliers', supplier.id, supplier, false);
      
      // Agregar a cola de sincronización si está offline
      if (!navigator.onLine) {
        await offlineStorage.addToSyncQueue('update', 'suppliers', supplier, supplier.id);
      }
    } catch (error) {
      console.error('Error guardando proveedor:', error);
    }
  }

  private async saveSuppliersToStorage(): Promise<void> {
    try {
      const suppliersArray = Array.from(this.suppliers.values());
      this.storage.save('suppliers', suppliersArray);
    } catch (error) {
      console.error('Error guardando proveedores en localStorage:', error);
    }
  }

  private generateSupplierId(): string {
    return `supp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private isValidCuit(cuit: string): boolean {
    // Remover guiones y espacios
    const cleanCuit = cuit.replace(/[-\s]/g, '');
    
    // Verificar que tenga 11 dígitos
    if (!/^\d{11}$/.test(cleanCuit)) {
      return false;
    }

    // Algoritmo de validación de CUIT
    const digits = cleanCuit.split('').map(Number);
    const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    
    let sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += digits[i] * multipliers[i];
    }
    
    const remainder = sum % 11;
    const checkDigit = remainder < 2 ? remainder : 11 - remainder;
    
    return checkDigit === digits[10];
  }
}