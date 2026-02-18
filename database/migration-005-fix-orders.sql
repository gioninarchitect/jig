-- Migration 005: Add all potentially missing columns to orders table
-- Safe to run multiple times (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)

-- Add missing columns one by one
ALTER TABLE orders ADD COLUMN IF NOT EXISTS po_number VARCHAR(20);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(20);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_street VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_city VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_province VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_postal_code VARCHAR(10);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_country VARCHAR(50) DEFAULT 'South Africa';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_name VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_due_date TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- Ensure order_sequences table and pop_uploads exist
CREATE TABLE IF NOT EXISTS order_sequences (
    sequence_name VARCHAR(50) PRIMARY KEY,
    current_value INTEGER NOT NULL DEFAULT 0
);
INSERT INTO order_sequences VALUES ('po', 0), ('invoice', 0) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS pop_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id VARCHAR(20) NOT NULL REFERENCES orders(id),
    client_id UUID NOT NULL REFERENCES clients(id),
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    admin_notes TEXT,
    reviewed_by UUID REFERENCES clients(id),
    reviewed_at TIMESTAMPTZ,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pop_order ON pop_uploads (order_id);
CREATE INDEX IF NOT EXISTS idx_pop_status ON pop_uploads (status);

-- Ensure subcategory exists on products
ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory VARCHAR(100);
