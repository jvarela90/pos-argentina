# Sistema POS Modular Argentina - Desarrollo Práctico

## Reunión de Desarrollo: Roles y Decisiones

**INGENIERO DE SOFTWARE**: "Necesitamos módulos que funcionen independientes desde el día 1. Cada uno debe poder instalarse, probarse y desinstalarse sin afectar otros."

**ANALISTA DE SISTEMAS**: "Propongo arquitectura de micro-aplicaciones. Cada módulo es una mini-app que se conecta al core mediante eventos."

**ANALISTA PROGRAMADOR**: "Implementemos con Web Components para máxima compatibilidad y Hot Module Replacement para desarrollo ágil."

**COMERCIANTES**: "Queremos probar gratis 30 días cada módulo, pagar mensual, y desactivar lo que no usamos sin perder datos."

---

## MÓDULO 1: POS-CORE (Base Obligatoria)
**Precio**: $12.000 ARS/mes | **Prueba**: 30 días gratis

### Código Base Mínimo Funcional

```javascript
// pos-core/main.js
class POSCore {
  constructor() {
    this.cart = [];
    this.total = 0;
    this.config = this.loadConfig();
  }

  // Funciones esenciales - 5 líneas máximo cada una
  addProduct(product) {
    this.cart.push({...product, id: Date.now()});
    this.updateTotal();
  }

  removeProduct(id) {
    this.cart = this.cart.filter(item => item.id !== id);
    this.updateTotal();
  }

  updateTotal() {
    this.total = this.cart.reduce((sum, item) => 
      sum + (item.price * item.quantity), 0);
  }

  processPayment(method, amount) {
    if (amount >= this.total) {
      this.finalizeSale();
      return { success: true, change: amount - this.total };
    }
    return { success: false, error: 'Monto insuficiente' };
  }

  finalizeSale() {
    const sale = {
      id: Date.now(),
      items: [...this.cart],
      total: this.total,
      timestamp: new Date(),
      method: 'efectivo'
    };
    
    this.saveSale(sale);
    this.cart = [];
    this.total = 0;
    this.printReceipt(sale);
  }
}
```

### Interface HTML Minimalista
```html
<!-- pos-core/interface.html -->
<div id="pos-core-app">
  <div class="product-grid">
    <button onclick="pos.addProduct({name:'Pan', price:500, quantity:1})">
      Pan $500
    </button>
    <button onclick="pos.addProduct({name:'Leche', price:800, quantity:1})">
      Leche $800
    </button>
  </div>
  
  <div class="cart">
    <div id="cart-items"></div>
    <div class="total">Total: $<span id="total">0</span></div>
    <button onclick="pos.processPayment('efectivo', prompt('Monto:'))">
      COBRAR
    </button>
  </div>
</div>
```

**QUÉ INCLUYE POR $12.000/mes**:
- Terminal de venta básica (funciona en tablet/celular)
- Carrito de compras
- Cálculo automático de totales
- Pago en efectivo
- Impresión de tickets simples
- Funciona 100% offline
- Hasta 500 productos

---

## MÓDULO 2: INVENTORY-LITE (Gestión Básica)
**Precio**: +$4.000 ARS/mes | **Prueba**: 15 días gratis

### Código Independiente
```javascript
// inventory-lite/main.js
class InventoryLite {
  constructor() {
    this.products = this.loadProducts();
  }

  addProduct(product) {
    const newProduct = {
      id: Date.now(),
      name: product.name,
      price: product.price,
      stock: product.stock || 0,
      barcode: product.barcode || null
    };
    
    this.products.push(newProduct);
    this.saveProducts();
    this.emit('product-added', newProduct);
  }

  updateStock(productId, newStock) {
    const product = this.products.find(p => p.id === productId);
    if (product) {
      product.stock = newStock;
      this.saveProducts();
      this.emit('stock-updated', product);
    }
  }

  searchProduct(query) {
    return this.products.filter(p => 
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.barcode === query
    );
  }

  lowStockAlert() {
    return this.products.filter(p => p.stock < 5);
  }
}
```

**QUÉ INCLUYE POR +$4.000/mes**:
- Agregar/editar hasta 2.000 productos
- Control básico de stock
- Búsqueda por nombre o código de barras
- Alertas de stock bajo
- Backup automático diario

---

## MÓDULO 3: CUSTOMERS-BASIC (Clientes y Fiado)
**Precio**: +$3.000 ARS/mes | **Prueba**: 15 días gratis

### Código Especializado para Argentina
```javascript
// customers-basic/main.js
class CustomersBasic {
  constructor() {
    this.customers = this.loadCustomers();
  }

  addCustomer(data) {
    const customer = {
      id: Date.now(),
      name: data.name,
      dni: data.dni,
      phone: data.phone,
      address: data.address,
      creditLimit: data.creditLimit || 10000,
      currentDebt: 0,
      created: new Date()
    };
    
    this.customers.push(customer);
    this.saveCustomers();
    return customer;
  }

  // Función clave para Argentina: "fiado"
  addCredit(customerId, amount, description) {
    const customer = this.findCustomer(customerId);
    if (!customer) return false;
    
    if (customer.currentDebt + amount > customer.creditLimit) {
      return { success: false, error: 'Límite de crédito excedido' };
    }
    
    customer.currentDebt += amount;
    customer.transactions = customer.transactions || [];
    customer.transactions.push({
      date: new Date(),
      amount: amount,
      type: 'credit',
      description: description
    });
    
    this.saveCustomers();
    return { success: true, newDebt: customer.currentDebt };
  }

  payDebt(customerId, amount) {
    const customer = this.findCustomer(customerId);
    if (customer) {
      customer.currentDebt = Math.max(0, customer.currentDebt - amount);
      customer.transactions.push({
        date: new Date(),
        amount: amount,
        type: 'payment',
        description: 'Pago de deuda'
      });
      this.saveCustomers();
    }
  }
}
```

**QUÉ INCLUYE POR +$3.000/mes**:
- Registro de hasta 1.000 clientes
- Sistema de cuenta corriente ("fiado")
- Límites de crédito configurables
- Historial de transacciones
- Recordatorios de cobro

---

## MÓDULO 4: FISCAL-SIMPLE (AFIP Básico)
**Precio**: +$6.000 ARS/mes | **Prueba**: 7 días gratis

### Integración AFIP Simplificada
```javascript
// fiscal-simple/afip.js
class FiscalSimple {
  constructor(cuit, environment = 'testing') {
    this.cuit = cuit;
    this.environment = environment;
    this.wsfe = new AFIPWebService(cuit, environment);
  }

  async generateInvoice(sale, customerData) {
    // Solo facturas B y C para simplificar
    const invoiceType = customerData.cuit ? 6 : 11; // B o C
    
    const invoice = {
      CbteTipo: invoiceType,
      PtoVta: 1,
      Concepto: 1, // Productos
      DocTipo: customerData.dni ? 96 : 99, // DNI o Sin identificar
      DocNro: customerData.dni || 0,
      CbteDesde: await this.getNextInvoiceNumber(),
      CbteHasta: await this.getNextInvoiceNumber(),
      CbteFch: this.formatDate(new Date()),
      ImpTotal: sale.total,
      ImpTotConc: 0,
      ImpNeto: Math.round(sale.total / 1.21 * 100) / 100,
      ImpOpEx: 0,
      ImpIVA: Math.round(sale.total * 0.21 * 100) / 100,
      MonId: 'PES',
      MonCotiz: 1
    };

    try {
      const result = await this.wsfe.FECAESolicitar(invoice);
      if (result.success) {
        this.saveInvoice({...invoice, cae: result.cae});
        return { success: true, cae: result.cae };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
```

**QUÉ INCLUYE POR +$6.000/mes**:
- Facturación electrónica AFIP (tipos B y C)
- CAE automático
- Backup en la nube
- Reportes para contador
- Hasta 500 facturas/mes

---

## MÓDULO 5: PAYMENTS-DIGITAL (Pagos Modernos)
**Precio**: +$5.000 ARS/mes | **Prueba**: 7 días gratis

### Integración Mercado Pago
```javascript
// payments-digital/mercadopago.js
class PaymentsDigital {
  constructor(accessToken) {
    this.mp = new MercadoPago(accessToken);
  }

  async processQRPayment(amount, description) {
    const qrData = {
      transaction_amount: amount,
      description: description,
      payment_method_id: 'qr_dynamic',
      external_reference: `sale_${Date.now()}`
    };

    try {
      const payment = await this.mp.payment.create(qrData);
      return {
        success: true,
        qr_code: payment.point_of_interaction.transaction_data.qr_code,
        payment_id: payment.id
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async processCardPayment(amount, cardToken) {
    const payment = {
      transaction_amount: amount,
      token: cardToken,
      installments: 1,
      payment_method_id: 'visa',
      payer: { email: 'customer@email.com' }
    };

    try {
      const result = await this.mp.payment.create(payment);
      return {
        success: true,
        status: result.status,
        payment_id: result.id
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
```

**QUÉ INCLUYE POR +$5.000/mes**:
- Pagos con QR (Mercado Pago, MODO)
- Procesamiento de tarjetas
- Link de pago por WhatsApp
- Reconciliación automática
- Comisión: 2.9% + IVA por transacción

---

## MÓDULO 6: REPORTS-BASIC (Reportes Simples)
**Precio**: +$2.500 ARS/mes | **Prueba**: 15 días gratis

### Reportes Esenciales
```javascript
// reports-basic/generator.js
class ReportsBasic {
  constructor(salesData) {
    this.sales = salesData;
  }

  dailySummary(date = new Date()) {
    const dayStart = new Date(date.setHours(0,0,0,0));
    const dayEnd = new Date(date.setHours(23,59,59,999));
    
    const daySales = this.sales.filter(sale => 
      sale.timestamp >= dayStart && sale.timestamp <= dayEnd
    );

    return {
      totalSales: daySales.length,
      totalAmount: daySales.reduce((sum, sale) => sum + sale.total, 0),
      cashSales: daySales.filter(s => s.method === 'efectivo').length,
      cardSales: daySales.filter(s => s.method === 'tarjeta').length,
      topProducts: this.getTopProducts(daySales)
    };
  }

  weeklySummary() {
    // Resumen semanal básico
  }

  exportToExcel(data) {
    // Exportación simple a Excel
  }
}
```

**QUÉ INCLUYE POR +$2.500/mes**:
- Reporte diario automático
- Resumen semanal
- Top 10 productos más vendidos
- Exportar a Excel
- Gráficos básicos

---

## SISTEMA DE PRECIOS MODULAR REAL

### Combos Pre-configurados

**COMBO KIOSCO** - $18.000/mes
- POS-Core ($12.000)
- Inventory-Lite ($4.000)
- Descuento combo: -$2.000
- **Total: $18.000** (ahorro $2.000)

**COMBO ALMACÉN** - $21.000/mes  
- POS-Core ($12.000)
- Inventory-Lite ($4.000)
- Customers-Basic ($3.000)
- Reports-Basic ($2.500)
- Descuento combo: -$500
- **Total: $21.000** (ahorro $500)

**COMBO PROFESIONAL** - $32.000/mes
- POS-Core ($12.000)
- Inventory-Lite ($4.000)
- Customers-Basic ($3.000)
- Fiscal-Simple ($6.000)
- Payments-Digital ($5.000)
- Reports-Basic ($2.500)
- Descuento combo: -$500
- **Total: $32.000** (ahorro $500)

### Módulos Adicionales (A la carta)

**MÓDULOS PREMIUM**:
- **Multi-Terminal**: +$3.000/mes por terminal adicional
- **Backup Cloud**: +$1.500/mes (backup cada hora)
- **Soporte Telefónico**: +$2.000/mes (horario comercial)
- **Soporte 24/7**: +$5.000/mes

**MÓDULOS ESPECIALIZADOS**:
- **Restaurant-Mode**: +$4.000/mes (mesas, cocina, mozos)
- **Pharmacy-Mode**: +$6.000/mes (recetas, obras sociales)
- **Hardware-Integration**: +$2.000/mes (balanzas, lectores)

## Arquitectura de Instalación Modular

### Sistema de Plugins en Tiempo Real
```javascript
// core/module-manager.js
class ModuleManager {
  constructor() {
    this.installedModules = new Map();
    this.licenseManager = new LicenseManager();
  }

  async installModule(moduleId, licenseKey) {
    // Verificar licencia
    const isValid = await this.licenseManager.validate(licenseKey);
    if (!isValid) return { error: 'Licencia inválida' };

    // Descargar módulo
    const moduleCode = await this.downloadModule(moduleId);
    
    // Instalar en tiempo real
    const module = await import(`data:text/javascript,${moduleCode}`);
    module.install(this.app);
    
    this.installedModules.set(moduleId, module);
    return { success: true };
  }

  uninstallModule(moduleId) {
    const module = this.installedModules.get(moduleId);
    if (module) {
      module.uninstall(this.app);
      this.installedModules.delete(moduleId);
    }
  }
}
```

### Interface de Administración
```html
<!-- admin/modules.html -->
<div id="module-store">
  <h2>Tienda de Módulos</h2>
  
  <div class="module-card">
    <h3>Inventory-Lite</h3>
    <p>Gestión básica de productos y stock</p>
    <div class="price">$4.000/mes</div>
    <button onclick="installModule('inventory-lite')">
      Probar Gratis 15 días
    </button>
  </div>

  <div class="installed-modules">
    <h3>Módulos Instalados</h3>
    <div id="active-modules"></div>
  </div>
</div>
```

## Implementación por Fases

### SEMANA 1-2: POS-Core Funcional
- ✅ Venta básica con carrito
- ✅ Cálculo de totales
- ✅ Pago en efectivo  
- ✅ Impresión básica
- ✅ Funciona offline

### SEMANA 3: Inventory-Lite
- ✅ CRUD de productos
- ✅ Búsqueda básica
- ✅ Control de stock

### SEMANA 4: Customers-Basic
- ✅ Registro de clientes
- ✅ Sistema de fiado
- ✅ Límites de crédito

### SEMANA 5-6: Fiscal-Simple
- ✅ Integración AFIP básica
- ✅ Facturas B y C
- ✅ CAE automático

### SEMANA 7: Payments-Digital
- ✅ QR Mercado Pago
- ✅ Pagos con tarjeta
- ✅ Reconciliación

### SEMANA 8: Reports-Basic + Testing
- ✅ Reportes diarios
- ✅ Exportación Excel
- ✅ Testing integral

## Licenciamiento y Activación

### Códigos de Licencia por Módulo
```javascript
// licensing/manager.js
class LicenseManager {
  validateLicense(moduleId, licenseKey) {
    const decoded = this.decodeLicense(licenseKey);
    return {
      valid: decoded.moduleId === moduleId,
      expires: decoded.expirationDate,
      features: decoded.enabledFeatures
    };
  }

  // Formato: POS-INV-BASIC-202412-ABC123
  generateLicense(moduleId, duration, features) {
    return `POS-${moduleId.toUpperCase()}-${duration}-${this.generateHash()}`;
  }
}
```

Este sistema permite que cualquier comerciante:
1. **Empiece gratis** con pruebas de cada módulo
2. **Pague solo lo que usa** mensualmente
3. **Active/desactive módulos** sin perder datos
4. **Escale gradualmente** según crecimiento del negocio
5. **Personalice** con módulos específicos de su rubro

La arquitectura modular garantiza que cada componente funciona independientemente pero se integra perfectamente con los demás cuando es necesario.