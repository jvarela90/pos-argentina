import { EventBus, SystemEvents } from '../event-bus';
import { ModuleConfig, DomainEvent } from '../types';
import { StorageManager } from '../storage';

/**
 * Clase base abstracta que deben extender todos los módulos
 * Implementa patrón Template Method para funcionalidad común
 */
export abstract class BaseModule {
  protected config: ModuleConfig;
  protected eventBus: EventBus;
  protected storage: StorageManager;
  private isInstalled: boolean = false;
  private isActive: boolean = false;

  constructor(config: ModuleConfig) {
    this.config = config;
    this.eventBus = EventBus.getInstance();
    this.storage = new StorageManager(config.id);
    
    // Log de creación del módulo
    console.log(`🧩 Module created: ${config.name} v${config.version}`);
  }

  /**
   * Métodos obligatorios que debe implementar cada módulo
   */
  abstract install(): Promise<boolean>;
  abstract uninstall(): Promise<boolean>;
  abstract getVersion(): string;

  /**
   * Métodos opcionales con implementación por defecto
   */
  
  /**
   * Configura el módulo con nuevos settings
   */
  configure(settings: Record<string, any>): void {
    this.config = { ...this.config, ...settings };
    this.storage.save('config', this.config);
    this.emit(SystemEvents.MODULE_ACTIVATED, { config: this.config });
  }

  /**
   * Activa el módulo después de instalarlo
   */
  async activate(): Promise<boolean> {
    try {
      if (!this.isInstalled) {
        const installed = await this.install();
        if (!installed) {
          throw new Error('Module installation failed');
        }
        this.isInstalled = true;
      }

      this.isActive = true;
      this.emit(SystemEvents.MODULE_ACTIVATED, { moduleId: this.config.id });
      console.log(`✅ Module activated: ${this.config.name}`);
      return true;
    } catch (error) {
      console.error(`❌ Module activation failed: ${this.config.name}`, error);
      return false;
    }
  }

  /**
   * Desactiva el módulo pero no lo desinstala
   */
  async deactivate(): Promise<boolean> {
    try {
      this.isActive = false;
      this.emit(SystemEvents.MODULE_DEACTIVATED, { moduleId: this.config.id });
      console.log(`⏸️ Module deactivated: ${this.config.name}`);
      return true;
    } catch (error) {
      console.error(`❌ Module deactivation failed: ${this.config.name}`, error);
      return false;
    }
  }

  /**
   * Valida si la licencia del módulo es válida
   */
  validateLicense(licenseKey: string): boolean {
    // Implementación básica - en producción usar sistema robusto
    if (this.config.id === 'pos-core') {
      return true; // Core siempre válido
    }

    // Formato esperado: POS-{MODULE}-{YEAR}{MONTH}-{HASH}
    const pattern = new RegExp(`^POS-${this.config.id.toUpperCase()}-\\d{6}-[A-Z0-9]{6}$`);
    return pattern.test(licenseKey);
  }

  /**
   * Emite un evento desde este módulo
   */
  protected emit(eventType: string, data: any): void {
    this.eventBus.emitEvent(eventType, this.config.id, data);
  }

  /**
   * Se suscribe a eventos de otros módulos
   */
  protected subscribe(moduleId: string, eventType: string, handler: (event: DomainEvent) => void): void {
    this.eventBus.subscribe(moduleId, eventType, handler);
  }

  /**
   * Se suscribe a eventos de cualquier módulo
   */
  protected subscribeToAll(handler: (event: DomainEvent) => void): void {
    this.eventBus.subscribeToAll(handler);
  }

  /**
   * Getters para información del módulo
   */
  getConfig(): ModuleConfig {
    return { ...this.config };
  }

  getId(): string {
    return this.config.id;
  }

  getName(): string {
    return this.config.name;
  }

  getDependencies(): string[] {
    return [...this.config.dependencies];
  }

  isModuleActive(): boolean {
    return this.isActive;
  }

  isModuleInstalled(): boolean {
    return this.isInstalled;
  }

  getPrice(): number {
    return this.config.price;
  }

  getTrialDays(): number {
    return this.config.trialDays;
  }

  /**
   * Método de cleanup llamado al destruir el módulo
   */
  destroy(): void {
    this.eventBus.removeAllListeners(`${this.config.id}:*`);
    console.log(`🗑️ Module destroyed: ${this.config.name}`);
  }

  /**
   * Método para debugging - información del módulo
   */
  getDebugInfo(): object {
    return {
      config: this.config,
      isInstalled: this.isInstalled,
      isActive: this.isActive,
      eventHistory: this.eventBus.getEventHistory(this.config.id),
      storageKeys: this.storage.getAllKeys()
    };
  }
}