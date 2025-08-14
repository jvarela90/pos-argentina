import { 
  Sale, 
  PaymentResult, 
  formatCurrency, 
  formatDate 
} from '@pos-argentina/shared';

/**
 * Servicio de impresión de tickets y comprobantes
 * Genera contenido de tickets y maneja impresión básica
 */
export class ReceiptPrinter {
  private config: {
    storeName: string;
    storeAddress: string;
    storePhone: string;
    footer: string;
  };

  constructor() {
    this.config = {
      storeName: 'Almacén Don Carlos',
      storeAddress: 'Av. Corrientes 1234, CABA',
      storePhone: '011-1234-5678',
      footer: 'Gracias por su compra'
    };
  }

  /**
   * Imprime ticket de venta
   */
  async printSale(sale: Sale, paymentResult: PaymentResult): Promise<boolean> {
    try {
      const receiptContent = this.generateSaleReceipt(sale, paymentResult);
      
      console.log('🖨️ Printing receipt...');
      console.log(receiptContent);
      
      // En navegador, simular impresión
      if (typeof window !== 'undefined') {
        await this.printInBrowser(receiptContent);
      } else {
        // En servidor, log del contenido
        console.log('📄 Receipt content generated successfully');
      }

      return true;
    } catch (error) {
      console.error('❌ Print failed:', error);
      return false;
    }
  }

  /**
   * Imprime ticket de devolución
   */
  async printRefund(originalSale: Sale, refundAmount: number): Promise<boolean> {
    try {
      const refundContent = this.generateRefundReceipt(originalSale, refundAmount);
      
      console.log('🖨️ Printing refund receipt...');
      console.log(refundContent);
      
      if (typeof window !== 'undefined') {
        await this.printInBrowser(refundContent);
      }

      return true;
    } catch (error) {
      console.error('❌ Refund print failed:', error);
      return false;
    }
  }

  /**
   * Imprime reporte diario
   */
  async printDailyReport(sales: Sale[], date: Date): Promise<boolean> {
    try {
      const reportContent = this.generateDailyReport(sales, date);
      
      console.log('🖨️ Printing daily report...');
      console.log(reportContent);
      
      if (typeof window !== 'undefined') {
        await this.printInBrowser(reportContent);
      }

      return true;
    } catch (error) {
      console.error('❌ Daily report print failed:', error);
      return false;
    }
  }

  /**
   * Configura datos del comercio
   */
  configureStore(config: {
    storeName?: string;
    storeAddress?: string;
    storePhone?: string;
    footer?: string;
  }): void {
    this.config = { ...this.config, ...config };
  }

  // ===========================================
  // GENERADORES DE CONTENIDO
  // ===========================================

  private generateSaleReceipt(sale: Sale, paymentResult: PaymentResult): string {
    const width = 40; // Ancho típico impresora térmica
    const line = '='.repeat(width);
    
    let receipt = '';
    
    // Header
    receipt += this.centerText(this.config.storeName, width) + '\n';
    receipt += this.centerText(this.config.storeAddress, width) + '\n';
    receipt += this.centerText(this.config.storePhone, width) + '\n';
    receipt += line + '\n';
    
    // Información de la venta
    receipt += `Fecha: ${formatDate(sale.timestamp)}\n`;
    receipt += `Ticket: ${sale.receiptNumber || sale.id.substring(0, 8)}\n`;
    
    if (sale.customerName) {
      receipt += `Cliente: ${sale.customerName}\n`;
    }
    
    receipt += line + '\n';
    
    // Items
    receipt += this.padText('DESCRIPCIÓN', 'CANT', 'PRECIO', width) + '\n';
    receipt += '-'.repeat(width) + '\n';
    
    sale.items.forEach(item => {
      // Línea del producto
      receipt += this.truncateText(item.name, 20);
      receipt += this.rightAlign(`${item.quantity}`, 6);
      receipt += this.rightAlign(formatCurrency(item.price), 14);
      receipt += '\n';
      
      // Subtotal si cantidad > 1
      if (item.quantity > 1) {
        receipt += this.rightAlign(`Subtotal: ${formatCurrency(item.price * item.quantity)}`, width) + '\n';
      }
      
      // Descuento si aplica
      if (item.discount > 0) {
        receipt += this.rightAlign(`Descuento: -${formatCurrency(item.discount)}`, width) + '\n';
      }
    });
    
    receipt += '-'.repeat(width) + '\n';
    
    // Totales
    receipt += this.padRight('Subtotal:', width - 10);
    receipt += this.rightAlign(formatCurrency(sale.subtotal), 10) + '\n';
    
    if (sale.discount > 0) {
      receipt += this.padRight('Descuento:', width - 10);
      receipt += this.rightAlign(`-${formatCurrency(sale.discount)}`, 10) + '\n';
    }
    
    if (sale.tax > 0) {
      receipt += this.padRight('IVA (21%):', width - 10);
      receipt += this.rightAlign(formatCurrency(sale.tax), 10) + '\n';
    }
    
    receipt += line + '\n';
    receipt += this.padRight('TOTAL:', width - 10);
    receipt += this.rightAlign(formatCurrency(sale.total), 10) + '\n';
    receipt += line + '\n';
    
    // Información del pago
    receipt += `Forma de pago: ${this.getPaymentMethodName(sale.paymentMethod)}\n`;
    
    if (paymentResult.change && paymentResult.change > 0) {
      receipt += `Su vuelto: ${formatCurrency(paymentResult.change)}\n`;
    }
    
    if (paymentResult.authCode) {
      receipt += `Código auth: ${paymentResult.authCode}\n`;
    }
    
    receipt += '\n';
    receipt += this.centerText(this.config.footer, width) + '\n';
    receipt += this.centerText('¡Vuelva pronto!', width) + '\n';
    
    // QR code placeholder
    receipt += '\n';
    receipt += this.centerText('[QR CODE]', width) + '\n';
    receipt += this.centerText('Escanee para calificar', width) + '\n';
    
    return receipt;
  }

  private generateRefundReceipt(originalSale: Sale, refundAmount: number): string {
    const width = 40;
    const line = '='.repeat(width);
    
    let receipt = '';
    
    // Header
    receipt += this.centerText(this.config.storeName, width) + '\n';
    receipt += this.centerText('TICKET DE DEVOLUCIÓN', width) + '\n';
    receipt += line + '\n';
    
    receipt += `Fecha: ${formatDate(new Date())}\n`;
    receipt += `Ticket original: ${originalSale.receiptNumber || originalSale.id.substring(0, 8)}\n`;
    receipt += `Fecha original: ${formatDate(originalSale.timestamp)}\n`;
    
    receipt += line + '\n';
    receipt += this.padRight('Monto devuelto:', width - 12);
    receipt += this.rightAlign(formatCurrency(refundAmount), 12) + '\n';
    receipt += line + '\n';
    
    receipt += '\n';
    receipt += this.centerText('Conserve este comprobante', width) + '\n';
    
    return receipt;
  }

  private generateDailyReport(sales: Sale[], date: Date): string {
    const width = 40;
    const line = '='.repeat(width);
    
    const totalSales = sales.length;
    const totalAmount = sales.reduce((sum, sale) => sum + sale.total, 0);
    const cashSales = sales.filter(s => s.paymentMethod === 'cash');
    const cardSales = sales.filter(s => s.paymentMethod.includes('card'));
    
    let report = '';
    
    // Header
    report += this.centerText(this.config.storeName, width) + '\n';
    report += this.centerText('REPORTE DIARIO', width) + '\n';
    report += this.centerText(formatDate(date).split(' ')[0], width) + '\n';
    report += line + '\n';
    
    // Resumen
    report += this.padRight('Total ventas:', width - 8);
    report += this.rightAlign(totalSales.toString(), 8) + '\n';
    
    report += this.padRight('Monto total:', width - 12);
    report += this.rightAlign(formatCurrency(totalAmount), 12) + '\n';
    
    report += line + '\n';
    
    // Por forma de pago
    report += 'FORMAS DE PAGO:\n';
    report += this.padRight('Efectivo:', width - 12);
    report += this.rightAlign(`${cashSales.length} - ${formatCurrency(cashSales.reduce((sum, s) => sum + s.total, 0))}`, 12) + '\n';
    
    report += this.padRight('Tarjetas:', width - 12);
    report += this.rightAlign(`${cardSales.length} - ${formatCurrency(cardSales.reduce((sum, s) => sum + s.total, 0))}`, 12) + '\n';
    
    report += line + '\n';
    report += this.centerText(`Generado: ${formatDate(new Date())}`, width) + '\n';
    
    return report;
  }

  // ===========================================
  // UTILIDADES DE FORMATO
  // ===========================================

  private centerText(text: string, width: number): string {
    if (text.length >= width) {
      return text.substring(0, width);
    }
    
    const padding = Math.floor((width - text.length) / 2);
    return ' '.repeat(padding) + text + ' '.repeat(width - padding - text.length);
  }

  private rightAlign(text: string, width: number): string {
    if (text.length >= width) {
      return text.substring(0, width);
    }
    
    return ' '.repeat(width - text.length) + text;
  }

  private padRight(text: string, width: number): string {
    if (text.length >= width) {
      return text.substring(0, width);
    }
    
    return text + ' '.repeat(width - text.length);
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return this.padRight(text, maxLength);
    }
    
    return text.substring(0, maxLength - 3) + '...';
  }

  private padText(left: string, center: string, right: string, totalWidth: number): string {
    const leftWidth = 20;
    const centerWidth = 6;
    const rightWidth = totalWidth - leftWidth - centerWidth;
    
    return this.truncateText(left, leftWidth) + 
           this.centerText(center, centerWidth) + 
           this.rightAlign(right, rightWidth);
  }

  private getPaymentMethodName(method: string): string {
    const methodNames = {
      'cash': 'Efectivo',
      'credit_card': 'Tarjeta de Crédito',
      'debit_card': 'Tarjeta de Débito',
      'mercadopago': 'MercadoPago',
      'qr': 'QR',
      'account_credit': 'Cuenta Corriente',
      'mixed': 'Pago Mixto'
    };
    
    return methodNames[method as keyof typeof methodNames] || method;
  }

  // ===========================================
  // MÉTODOS DE IMPRESIÓN
  // ===========================================

  private async printInBrowser(content: string): Promise<void> {
    try {
      // Crear ventana de impresión
      const printWindow = window.open('', '_blank', 'width=400,height=600');
      
      if (!printWindow) {
        throw new Error('No se pudo abrir ventana de impresión');
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Ticket</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              line-height: 1.2;
              margin: 10px;
              white-space: pre-wrap;
            }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          ${content}
        </body>
        </html>
      `);

      printWindow.document.close();
      
      // Esperar a que cargue y luego imprimir
      await new Promise(resolve => {
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
            printWindow.close();
            resolve(void 0);
          }, 100);
        };
      });

      console.log('✅ Receipt printed successfully');
    } catch (error) {
      console.error('❌ Browser print failed:', error);
      
      // Fallback: mostrar en consola
      console.log('📄 Receipt content:');
      console.log(content);
    }
  }

  /**
   * Configuración para impresora térmica real (ESC/POS)
   */
  private generateESCPOSCommands(content: string): Uint8Array {
    // Comandos ESC/POS básicos para impresoras térmicas
    const ESC = 0x1B;
    const GS = 0x1D;
    
    const commands: number[] = [];
    
    // Inicializar impresora
    commands.push(ESC, 0x40);
    
    // Configurar fuente
    commands.push(ESC, 0x4D, 0x00); // Fuente A (12x24)
    
    // Contenido del ticket
    const textBytes = new TextEncoder().encode(content);
    commands.push(...Array.from(textBytes));
    
    // Cortar papel
    commands.push(GS, 0x56, 0x00);
    
    return new Uint8Array(commands);
  }
}