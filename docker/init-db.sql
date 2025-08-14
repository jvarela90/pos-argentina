-- Script de inicialización de base de datos para POS Argentina
-- Ejecutado automáticamente al crear el contenedor PostgreSQL

-- Crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Crear esquemas
CREATE SCHEMA IF NOT EXISTS pos;
CREATE SCHEMA IF NOT EXISTS audit;

-- Tabla de usuarios del sistema
CREATE TABLE IF NOT EXISTS pos.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'cashier',
    active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de productos
CREATE TABLE IF NOT EXISTS pos.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    barcode VARCHAR(100) UNIQUE,
    price DECIMAL(10,2) NOT NULL,
    cost DECIMAL(10,2),
    category VARCHAR(100) NOT NULL,
    stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 0,
    max_stock INTEGER,
    unit VARCHAR(50) DEFAULT 'unit',
    tax_rate DECIMAL(5,2) DEFAULT 21.00,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de clientes
CREATE TABLE IF NOT EXISTS pos.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    province VARCHAR(100),
    postal_code VARCHAR(10),
    tax_id VARCHAR(20),
    credit_limit DECIMAL(10,2) DEFAULT 0,
    current_balance DECIMAL(10,2) DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de ventas
CREATE TABLE IF NOT EXISTS pos.sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_number SERIAL UNIQUE,
    customer_id UUID REFERENCES pos.customers(id),
    user_id UUID REFERENCES pos.users(id) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'completed',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de items de venta
CREATE TABLE IF NOT EXISTS pos.sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID REFERENCES pos.sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES pos.products(id),
    product_name VARCHAR(255) NOT NULL,
    product_barcode VARCHAR(100),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    tax_rate DECIMAL(5,2) NOT NULL,
    line_total DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de movimientos de stock
CREATE TABLE IF NOT EXISTS pos.stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES pos.products(id) NOT NULL,
    movement_type VARCHAR(50) NOT NULL, -- 'in', 'out', 'adjustment'
    quantity INTEGER NOT NULL,
    previous_stock INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    reason VARCHAR(255),
    reference_id UUID, -- ID de venta, compra, etc.
    reference_type VARCHAR(50), -- 'sale', 'purchase', 'adjustment'
    user_id UUID REFERENCES pos.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de cuenta corriente (fiado)
CREATE TABLE IF NOT EXISTS pos.customer_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES pos.customers(id) NOT NULL,
    transaction_type VARCHAR(50) NOT NULL, -- 'charge', 'payment'
    amount DECIMAL(10,2) NOT NULL,
    balance_after DECIMAL(10,2) NOT NULL,
    description TEXT,
    sale_id UUID REFERENCES pos.sales(id),
    payment_method VARCHAR(50),
    user_id UUID REFERENCES pos.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de configuración del sistema
CREATE TABLE IF NOT EXISTS pos.settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    category VARCHAR(50) DEFAULT 'general',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de auditoría
CREATE TABLE IF NOT EXISTS audit.activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES pos.users(id),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_products_barcode ON pos.products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON pos.products(category);
CREATE INDEX IF NOT EXISTS idx_products_active ON pos.products(active);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON pos.sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON pos.sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON pos.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON pos.sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON pos.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_customer_accounts_customer_id ON pos.customer_accounts(customer_id);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON pos.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON pos.products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON pos.customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON pos.sales
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON pos.settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para actualizar balance de clientes
CREATE OR REPLACE FUNCTION update_customer_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE pos.customers 
        SET current_balance = (
            SELECT COALESCE(SUM(
                CASE 
                    WHEN transaction_type = 'charge' THEN amount
                    WHEN transaction_type = 'payment' THEN -amount
                    ELSE 0
                END
            ), 0)
            FROM pos.customer_accounts 
            WHERE customer_id = NEW.customer_id
        )
        WHERE id = NEW.customer_id;
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customer_balance_trigger
    AFTER INSERT ON pos.customer_accounts
    FOR EACH ROW EXECUTE FUNCTION update_customer_balance();

-- Función para actualizar stock automáticamente
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE pos.products 
        SET stock = NEW.new_stock
        WHERE id = NEW.product_id;
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_product_stock_trigger
    AFTER INSERT ON pos.stock_movements
    FOR EACH ROW EXECUTE FUNCTION update_product_stock();

-- Insertar configuraciones por defecto
INSERT INTO pos.settings (key, value, description, category) VALUES
    ('business_name', 'Mi Negocio', 'Nombre del negocio', 'general'),
    ('business_address', '', 'Dirección del negocio', 'general'),
    ('business_phone', '', 'Teléfono del negocio', 'general'),
    ('business_email', '', 'Email del negocio', 'general'),
    ('tax_rate', '21.00', 'Tasa de IVA por defecto', 'tax'),
    ('currency', 'ARS', 'Moneda', 'general'),
    ('timezone', 'America/Argentina/Buenos_Aires', 'Zona horaria', 'general'),
    ('receipt_footer', 'Gracias por su compra', 'Pie de página del ticket', 'receipt'),
    ('enable_customer_accounts', 'true', 'Habilitar cuentas corrientes', 'features'),
    ('backup_enabled', 'true', 'Respaldos automáticos habilitados', 'system')
ON CONFLICT (key) DO NOTHING;

-- Insertar usuario administrador por defecto
INSERT INTO pos.users (email, password_hash, first_name, last_name, role) VALUES
    ('admin@pos-argentina.com', crypt('admin123', gen_salt('bf')), 'Admin', 'POS', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Insertar productos de ejemplo
INSERT INTO pos.products (name, description, barcode, price, cost, category, stock, min_stock) VALUES
    ('Coca Cola 500ml', 'Gaseosa cola 500ml', '7790895001234', 250.00, 180.00, 'Bebidas', 50, 10),
    ('Pan Lactal', 'Pan de molde lactal', '7790001234567', 320.00, 220.00, 'Panadería', 25, 5),
    ('Leche Entera 1L', 'Leche entera larga vida', '7790002345678', 280.00, 200.00, 'Lácteos', 30, 8),
    ('Cigarrillos Box', 'Cigarrillos caja 20 unidades', '7790003456789', 850.00, 650.00, 'Cigarrillos', 40, 10),
    ('Café Molido 500g', 'Café molido torrado', '7790004567890', 1200.00, 900.00, 'Almacén', 15, 3)
ON CONFLICT (barcode) DO NOTHING;

-- Insertar cliente de ejemplo
INSERT INTO pos.customers (first_name, last_name, email, phone, credit_limit) VALUES
    ('Juan', 'Pérez', 'juan.perez@email.com', '1123456789', 5000.00),
    ('María', 'González', 'maria.gonzalez@email.com', '1198765432', 3000.00)
ON CONFLICT DO NOTHING;

-- Mensaje de finalización
DO $$
BEGIN
    RAISE NOTICE 'Base de datos POS Argentina inicializada correctamente';
    RAISE NOTICE 'Usuario admin creado: admin@pos-argentina.com / admin123';
    RAISE NOTICE 'Productos de ejemplo agregados';
END $$;