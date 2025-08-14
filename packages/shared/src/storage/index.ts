/**
 * Storage Manager para persistencia de datos local y sync
 * Implementa patrón Repository para abstracción de storage
 */
export class StorageManager {
  private prefix: string;
  private storage: Storage;

  constructor(moduleId: string, useSessionStorage: boolean = false) {
    this.prefix = `pos_${moduleId}_`;
    this.storage = useSessionStorage ? sessionStorage : localStorage;
  }

  /**
   * Guarda datos con clave
   */
  save<T>(key: string, data: T): void {
    try {
      const serializedData = JSON.stringify({
        data,
        timestamp: Date.now(),
        version: 1
      });
      this.storage.setItem(this.prefix + key, serializedData);
    } catch (error) {
      console.error(`Storage save failed for key ${key}:`, error);
      throw new Error(`Failed to save data: ${error.message}`);
    }
  }

  /**
   * Carga datos por clave
   */
  load<T>(key: string): T | null {
    try {
      const item = this.storage.getItem(this.prefix + key);
      if (!item) {
        return null;
      }

      const parsed = JSON.parse(item);
      return parsed.data as T;
    } catch (error) {
      console.error(`Storage load failed for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Elimina datos por clave
   */
  remove(key: string): void {
    this.storage.removeItem(this.prefix + key);
  }

  /**
   * Verifica si existe una clave
   */
  exists(key: string): boolean {
    return this.storage.getItem(this.prefix + key) !== null;
  }

  /**
   * Lista todas las claves del módulo
   */
  getAllKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keys.push(key.substring(this.prefix.length));
      }
    }
    return keys;
  }

  /**
   * Obtiene todos los datos del módulo
   */
  getAllData(): Record<string, any> {
    const data: Record<string, any> = {};
    const keys = this.getAllKeys();
    
    keys.forEach(key => {
      data[key] = this.load(key);
    });

    return data;
  }

  /**
   * Limpia todos los datos del módulo
   */
  clear(): void {
    const keys = this.getAllKeys();
    keys.forEach(key => this.remove(key));
  }

  /**
   * Guarda múltiples items en una transacción
   */
  saveBatch(items: Record<string, any>): void {
    try {
      Object.entries(items).forEach(([key, value]) => {
        this.save(key, value);
      });
    } catch (error) {
      console.error('Batch save failed:', error);
      throw error;
    }
  }

  /**
   * Carga múltiples items
   */
  loadBatch<T>(keys: string[]): Record<string, T | null> {
    const result: Record<string, T | null> = {};
    keys.forEach(key => {
      result[key] = this.load<T>(key);
    });
    return result;
  }

  /**
   * Exporta todos los datos para backup
   */
  export(): string {
    const allData = this.getAllData();
    return JSON.stringify({
      moduleId: this.prefix.replace('pos_', '').replace('_', ''),
      timestamp: Date.now(),
      data: allData
    });
  }

  /**
   * Importa datos desde backup
   */
  import(backupData: string): boolean {
    try {
      const parsed = JSON.parse(backupData);
      if (parsed.data) {
        this.saveBatch(parsed.data);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Import failed:', error);
      return false;
    }
  }

  /**
   * Obtiene el tamaño usado por el módulo (aproximado)
   */
  getUsageSize(): number {
    let size = 0;
    const keys = this.getAllKeys();
    
    keys.forEach(key => {
      const item = this.storage.getItem(this.prefix + key);
      if (item) {
        size += item.length;
      }
    });

    return size;
  }
}

/**
 * Sistema de almacenamiento offline avanzado con sincronización
 */
interface StorageItem<T = any> {
  data: T;
  timestamp: number;
  synced: boolean;
  id: string;
}

interface SyncQueue {
  operation: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  id: string;
  timestamp: number;
}

export class OfflineStorage {
  private dbName = 'pos-argentina-db';
  private version = 1;
  private db: IDBDatabase | null = null;
  private fallbackStorage = new Map<string, any>();

  async initialize(): Promise<void> {
    if (!this.isIndexedDBSupported()) {
      console.warn('IndexedDB no soportado, usando fallback localStorage');
      this.loadFromLocalStorage();
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Store para productos
        if (!db.objectStoreNames.contains('products')) {
          const productStore = db.createObjectStore('products', { keyPath: 'id' });
          productStore.createIndex('category', 'category');
          productStore.createIndex('active', 'active');
        }

        // Store para ventas
        if (!db.objectStoreNames.contains('sales')) {
          const salesStore = db.createObjectStore('sales', { keyPath: 'id' });
          salesStore.createIndex('date', 'date');
          salesStore.createIndex('status', 'status');
          salesStore.createIndex('synced', 'synced');
        }

        // Store para clientes
        if (!db.objectStoreNames.contains('customers')) {
          const customerStore = db.createObjectStore('customers', { keyPath: 'id' });
          customerStore.createIndex('email', 'email');
          customerStore.createIndex('phone', 'phone');
        }

        // Store para cola de sincronización
        if (!db.objectStoreNames.contains('sync_queue')) {
          db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
        }

        // Store para configuración
        if (!db.objectStoreNames.contains('config')) {
          db.createObjectStore('config', { keyPath: 'key' });
        }
      };
    });
  }

  private isIndexedDBSupported(): boolean {
    return typeof indexedDB !== 'undefined';
  }

  private loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem('pos-fallback-data');
      if (stored) {
        const data = JSON.parse(stored);
        this.fallbackStorage = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error('Error cargando datos desde localStorage:', error);
    }
  }

  private saveToLocalStorage(): void {
    try {
      const data = Object.fromEntries(this.fallbackStorage);
      localStorage.setItem('pos-fallback-data', JSON.stringify(data));
    } catch (error) {
      console.error('Error guardando en localStorage:', error);
    }
  }

  async set<T>(store: string, key: string, data: T, synced = false): Promise<void> {
    const item: StorageItem<T> = {
      data,
      timestamp: Date.now(),
      synced,
      id: key
    };

    if (!this.db) {
      this.fallbackStorage.set(`${store}:${key}`, item);
      this.saveToLocalStorage();
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async get<T>(store: string, key: string): Promise<T | null> {
    if (!this.db) {
      const item = this.fallbackStorage.get(`${store}:${key}`) as StorageItem<T>;
      return item ? item.data : null;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([store], 'readonly');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.get(key);

      request.onsuccess = () => {
        const item = request.result as StorageItem<T>;
        resolve(item ? item.data : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAll<T>(store: string): Promise<T[]> {
    if (!this.db) {
      const items: T[] = [];
      for (const [key, item] of this.fallbackStorage) {
        if (key.startsWith(`${store}:`)) {
          items.push((item as StorageItem<T>).data);
        }
      }
      return items;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([store], 'readonly');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.getAll();

      request.onsuccess = () => {
        const items = request.result as StorageItem<T>[];
        resolve(items.map(item => item.data));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async delete(store: string, key: string): Promise<void> {
    if (!this.db) {
      this.fallbackStorage.delete(`${store}:${key}`);
      this.saveToLocalStorage();
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async addToSyncQueue(operation: SyncQueue['operation'], table: string, data: any, id: string): Promise<void> {
    const queueItem: SyncQueue = {
      operation,
      table,
      data,
      id,
      timestamp: Date.now()
    };

    if (!this.db) {
      const queueKey = `sync_queue:${Date.now()}-${Math.random()}`;
      this.fallbackStorage.set(queueKey, queueItem);
      this.saveToLocalStorage();
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sync_queue'], 'readwrite');
      const objectStore = transaction.objectStore('sync_queue');
      const request = objectStore.add(queueItem);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getSyncQueue(): Promise<SyncQueue[]> {
    if (!this.db) {
      const items: SyncQueue[] = [];
      for (const [key, item] of this.fallbackStorage) {
        if (key.startsWith('sync_queue:')) {
          items.push(item as SyncQueue);
        }
      }
      return items.sort((a, b) => a.timestamp - b.timestamp);
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sync_queue'], 'readonly');
      const objectStore = transaction.objectStore('sync_queue');
      const request = objectStore.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clearSyncQueue(): Promise<void> {
    if (!this.db) {
      for (const key of this.fallbackStorage.keys()) {
        if (key.startsWith('sync_queue:')) {
          this.fallbackStorage.delete(key);
        }
      }
      this.saveToLocalStorage();
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sync_queue'], 'readwrite');
      const objectStore = transaction.objectStore('sync_queue');
      const request = objectStore.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getStorageInfo(): Promise<{
    isOnline: boolean;
    hasUnsynced: boolean;
    queueSize: number;
    lastSync: Date | null;
  }> {
    const queue = await this.getSyncQueue();
    const lastSync = await this.get<number>('config', 'lastSync');

    return {
      isOnline: navigator.onLine,
      hasUnsynced: queue.length > 0,
      queueSize: queue.length,
      lastSync: lastSync ? new Date(lastSync) : null
    };
  }

  async setLastSync(): Promise<void> {
    await this.set('config', 'lastSync', Date.now(), true);
  }
}

// Instancia singleton para almacenamiento offline
export const offlineStorage = new OfflineStorage();

/**
 * Utilidad para trabajar con IndexedDB para datos más complejos
 */
export class IndexedDBManager {
  private dbName: string;
  private version: number;
  private db: IDBDatabase | null = null;

  constructor(moduleId: string, version: number = 1) {
    this.dbName = `pos_${moduleId}_db`;
    this.version = version;
  }

  async init(stores: { name: string; keyPath: string; indices?: string[] }[]): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(true);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        stores.forEach(storeConfig => {
          if (!db.objectStoreNames.contains(storeConfig.name)) {
            const store = db.createObjectStore(storeConfig.name, { 
              keyPath: storeConfig.keyPath 
            });
            
            if (storeConfig.indices) {
              storeConfig.indices.forEach(index => {
                store.createIndex(index, index);
              });
            }
          }
        });
      };
    });
  }

  async save<T>(storeName: string, data: T): Promise<boolean> {
    if (!this.db) return false;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  async load<T>(storeName: string, key: any): Promise<T | null> {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async loadAll<T>(storeName: string): Promise<T[]> {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: string, key: any): Promise<boolean> {
    if (!this.db) return false;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }
}