-- Migration 008: Supplier/Farm Management
-- Tracks who supplies PureGro with product (farms, growers, processors, labs)

-- Supplier types
DO $$ BEGIN
  CREATE TYPE supplier_type AS ENUM ('farm', 'grower', 'processor', 'distributor', 'lab');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE supplier_status AS ENUM ('pending', 'approved', 'suspended', 'inactive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name VARCHAR(255) NOT NULL,
  supplier_type supplier_type NOT NULL DEFAULT 'farm',
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address_street VARCHAR(255),
  address_city VARCHAR(100),
  address_province VARCHAR(100),
  license_number VARCHAR(100),
  status supplier_status DEFAULT 'pending',
  payment_terms VARCHAR(50) DEFAULT 'COD',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- What products each supplier can provide
CREATE TABLE IF NOT EXISTS supplier_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  product_name VARCHAR(255) NOT NULL,
  sku VARCHAR(100),
  unit_price NUMERIC(10,2),
  min_order_qty INTEGER DEFAULT 1,
  lead_time_days INTEGER DEFAULT 7,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchase orders FROM PureGro TO suppliers (inbound stock)
CREATE TABLE IF NOT EXISTS supplier_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id),
  po_number VARCHAR(50) UNIQUE,
  status VARCHAR(20) DEFAULT 'draft',
  total NUMERIC(10,2) DEFAULT 0,
  expected_delivery DATE,
  received_at TIMESTAMPTZ,
  notes TEXT,
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supplier_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES supplier_orders(id) ON DELETE CASCADE,
  product_name VARCHAR(255),
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10,2),
  total_price NUMERIC(10,2),
  quantity_received INTEGER DEFAULT 0
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_suppliers_type ON suppliers(supplier_type);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);
CREATE INDEX IF NOT EXISTS idx_supplier_products_supplier ON supplier_products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_orders_supplier ON supplier_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_orders_status ON supplier_orders(status);
