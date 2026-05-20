-- ============================================================
-- Migration 009: Section 21 Retail Pharmacy Pivot
-- Transactional pharmacy pickup, package custody, inventory
-- movements, payments, refunds, settlements, and audit events.
-- This does not replace the Section 21 workflow. It adds partner
-- pharmacies as pickup/dispensing points after Section 21 eligibility
-- and prescription/authorization checks have passed.
--
-- Target: PostgreSQL transactional core.
-- UI/module boundary: JIGPOS/newbrand remains the Section 21
-- retail/pharmacy front end and can call this core through API.
-- TNT-ZA remains the separate track-and-trace / EU GMP QMS system.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- ENUMS
-- ────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE pharmacy_status AS ENUM ('onboarding', 'active', 'suspended', 'inactive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE pharmacy_fee_type AS ENUM ('FLAT', 'PERCENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE pharmacy_user_role AS ENUM ('RESPONSIBLE_PHARMACIST', 'PHARMACIST', 'PHARMACY_ASSISTANT', 'PHARMACY_ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE pharmacy_document_type AS ENUM (
    'pharmacy_license',
    'responsible_pharmacist_registration',
    'premises_proof',
    'bank_confirmation',
    'vat_certificate',
    'signed_partner_agreement',
    'storage_sop',
    'insurance',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE pharmacy_document_status AS ENUM ('pending', 'approved', 'rejected', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE pharmacy_order_status AS ENUM (
    'pending_payment',
    'paid',
    'packed',
    'shipped_to_pharmacy',
    'arrived_at_pharmacy',
    'collected',
    'uncollected_expired',
    'return_to_hub_requested',
    'returned_to_hub',
    'cancelled',
    'refunded'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_event_type AS ENUM (
    'authorized',
    'paid',
    'failed',
    'refunded',
    'chargeback',
    'manual_pop_approved',
    'manual_adjustment'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE pharmacy_payment_status AS ENUM ('PENDING', 'PAID', 'REFUNDED', 'PARTIAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_allocation_type AS ENUM (
    'consultation_fee',
    'medication_total',
    'delivery_fee',
    'pharmacy_handling_fee',
    'refund',
    'adjustment'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE inventory_batch_status AS ENUM ('available', 'quarantined', 'expired', 'recalled', 'depleted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE inventory_movement_type AS ENUM (
    'receipt',
    'reserve',
    'pack',
    'ship_to_pharmacy',
    'return_to_hub',
    'release_reservation',
    'adjustment',
    'write_off',
    'recall'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE package_status AS ENUM (
    'created',
    'packed',
    'sealed',
    'shipped_to_pharmacy',
    'arrived_at_pharmacy',
    'collected',
    'return_requested',
    'returned_to_hub',
    'destroyed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE package_custody_event_type AS ENUM (
    'created',
    'packed',
    'sealed',
    'dispatched',
    'courier_handover',
    'pharmacy_received',
    'customer_collected',
    'return_bin',
    'courier_return_handover',
    'hub_received',
    'destroyed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE pharmacy_ledger_action AS ENUM ('COLLECTION', 'RETURN', 'REVERSAL', 'ADJUSTMENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE pharmacy_payout_status AS ENUM ('ACCRUED', 'INVOICED', 'PAID', 'VOIDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE pharmacy_settlement_status AS ENUM ('draft', 'invoiced', 'paid', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE return_waybill_status AS ENUM ('requested', 'printed', 'collected_by_courier', 'in_transit', 'received_at_hub', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE refund_reason_code AS ENUM ('uncollected_expired', 'customer_cancelled', 'stock_unavailable', 'partial_return', 'manual_adjustment');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE refund_payable_status AS ENUM ('pending', 'approved', 'paid', 'voided');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE workflow_ticket_type AS ENUM (
    'pharmacy_onboarding',
    'license_expiry',
    'order_exception',
    'uncollected_warning',
    'return_required',
    'refund_pending',
    'stock_exception',
    'settlement_exception'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE workflow_ticket_priority AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE workflow_ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────
-- MASTER DATA
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_user_id VARCHAR(100),
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(50),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  id_number_hash VARCHAR(255),
  date_of_birth DATE,
  medical_profile_id UUID,
  section21_status VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS partner_pharmacies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  facility_name VARCHAR(255) NOT NULL,
  pharmacy_registration_number VARCHAR(100),
  license_number VARCHAR(100),
  license_expiry DATE,
  responsible_pharmacist_name VARCHAR(255),
  responsible_pharmacist_email VARCHAR(255),
  responsible_pharmacist_registration VARCHAR(100),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  address_street VARCHAR(255),
  address_city VARCHAR(100),
  address_province VARCHAR(100),
  address_postal_code VARCHAR(20),
  address_country VARCHAR(50) DEFAULT 'South Africa',
  handling_fee_type pharmacy_fee_type NOT NULL DEFAULT 'FLAT',
  handling_fee_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  vault_status BOOLEAN NOT NULL DEFAULT TRUE,
  status pharmacy_status NOT NULL DEFAULT 'onboarding',
  suspension_reason TEXT,
  activated_at TIMESTAMPTZ,
  activated_by UUID,
  created_by UUID,
  last_modified_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_pharmacies_status ON partner_pharmacies(status, vault_status);
CREATE INDEX IF NOT EXISTS idx_partner_pharmacies_license ON partner_pharmacies(license_number);

CREATE TABLE IF NOT EXISTS pharmacy_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id UUID NOT NULL REFERENCES partner_pharmacies(id),
  external_user_id VARCHAR(100),
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role pharmacy_user_role NOT NULL,
  registration_number VARCHAR(100),
  can_scan_arrivals BOOLEAN NOT NULL DEFAULT FALSE,
  can_release_collections BOOLEAN NOT NULL DEFAULT FALSE,
  can_mark_returns BOOLEAN NOT NULL DEFAULT FALSE,
  can_view_settlements BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_by UUID,
  last_modified_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(pharmacy_id, email)
);

CREATE INDEX IF NOT EXISTS idx_pharmacy_users_pharmacy_role ON pharmacy_users(pharmacy_id, role, active);

CREATE TABLE IF NOT EXISTS pharmacy_onboarding_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id UUID NOT NULL REFERENCES partner_pharmacies(id),
  doc_type pharmacy_document_type NOT NULL,
  file_name VARCHAR(255),
  file_path VARCHAR(500),
  file_size INTEGER,
  mime_type VARCHAR(100),
  status pharmacy_document_status NOT NULL DEFAULT 'pending',
  expiry_date DATE,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(pharmacy_id, doc_type)
);

CREATE INDEX IF NOT EXISTS idx_pharmacy_docs_pharmacy ON pharmacy_onboarding_documents(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_docs_status ON pharmacy_onboarding_documents(status);

-- ────────────────────────────────────────────────────────────
-- ORDERS, PAYMENTS, PACKAGE CUSTODY
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pharmacy_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_order_id VARCHAR(100) UNIQUE,
  order_number VARCHAR(100) UNIQUE NOT NULL,
  patient_id UUID REFERENCES patients(id),
  pharmacy_id UUID REFERENCES partner_pharmacies(id),
  section21_document_ref VARCHAR(100),
  prescription_reference VARCHAR(100),
  prescriber_reference VARCHAR(100),
  section21_verified BOOLEAN NOT NULL DEFAULT FALSE,
  dispensing_partner_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  consultation_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  medication_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  pharmacy_handling_fee_estimate NUMERIC(10,2),
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_status pharmacy_payment_status NOT NULL DEFAULT 'PENDING',
  status pharmacy_order_status NOT NULL DEFAULT 'pending_payment',
  gateway_payment_reference VARCHAR(255),
  arrived_at_pharmacy_at TIMESTAMPTZ,
  collected_at TIMESTAMPTZ,
  uncollected_expired_at TIMESTAMPTZ,
  returned_to_hub_at TIMESTAMPTZ,
  collection_otp_hash VARCHAR(255),
  collection_otp_expires_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE pharmacy_orders ADD COLUMN IF NOT EXISTS section21_document_ref VARCHAR(100);
ALTER TABLE pharmacy_orders ADD COLUMN IF NOT EXISTS prescription_reference VARCHAR(100);
ALTER TABLE pharmacy_orders ADD COLUMN IF NOT EXISTS prescriber_reference VARCHAR(100);
ALTER TABLE pharmacy_orders ADD COLUMN IF NOT EXISTS section21_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE pharmacy_orders ADD COLUMN IF NOT EXISTS dispensing_partner_confirmed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE pharmacy_orders ADD COLUMN IF NOT EXISTS payment_status pharmacy_payment_status NOT NULL DEFAULT 'PENDING';

CREATE INDEX IF NOT EXISTS idx_pharmacy_orders_status ON pharmacy_orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pharmacy_orders_payment_status ON pharmacy_orders(payment_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pharmacy_orders_pharmacy ON pharmacy_orders(pharmacy_id, status);
CREATE INDEX IF NOT EXISTS idx_pharmacy_orders_patient ON pharmacy_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_orders_section21 ON pharmacy_orders(section21_verified, section21_document_ref);

CREATE TABLE IF NOT EXISTS pharmacy_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES pharmacy_orders(id) ON DELETE CASCADE,
  external_product_id VARCHAR(100),
  sku VARCHAR(100),
  name VARCHAR(255) NOT NULL,
  quantity NUMERIC(12,3) NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(12,2) NOT NULL,
  batch_number VARCHAR(100),
  lot_number VARCHAR(100),
  expiry_date DATE,
  packed_inventory_movement_id UUID,
  returned_inventory_movement_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE pharmacy_order_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE pharmacy_order_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_pharmacy_order_items_order ON pharmacy_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_order_items_batch ON pharmacy_order_items(batch_number);

CREATE TABLE IF NOT EXISTS order_status_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES pharmacy_orders(id),
  from_status pharmacy_order_status,
  to_status pharmacy_order_status NOT NULL,
  reason_code VARCHAR(100),
  actor_type VARCHAR(50) NOT NULL DEFAULT 'user',
  actor_id VARCHAR(100),
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_status_events_order ON order_status_events(order_id, created_at DESC);

CREATE TABLE IF NOT EXISTS payment_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES pharmacy_orders(id),
  gateway VARCHAR(50) NOT NULL DEFAULT 'manual',
  gateway_reference VARCHAR(255),
  event_type payment_event_type NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'ZAR',
  raw_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  recorded_by VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_events_order ON payment_events(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_events_reference ON payment_events(gateway_reference);

CREATE TABLE IF NOT EXISTS payment_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES pharmacy_orders(id),
  payment_event_id UUID NOT NULL REFERENCES payment_events(id),
  allocation_type payment_allocation_type NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_allocations_order ON payment_allocations(order_id, allocation_type);

CREATE TABLE IF NOT EXISTS order_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES pharmacy_orders(id),
  package_code VARCHAR(100) UNIQUE NOT NULL,
  qr_payload TEXT NOT NULL,
  status package_status NOT NULL DEFAULT 'created',
  sealed_by VARCHAR(100),
  sealed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_packages_order ON order_packages(order_id);
CREATE INDEX IF NOT EXISTS idx_order_packages_status ON order_packages(status);

CREATE TABLE IF NOT EXISTS package_custody_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  package_id UUID NOT NULL REFERENCES order_packages(id),
  event_type package_custody_event_type NOT NULL,
  actor_type VARCHAR(50) NOT NULL DEFAULT 'user',
  actor_id VARCHAR(100),
  location_type VARCHAR(50),
  location_id VARCHAR(100),
  scan_payload TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_package_custody_package ON package_custody_events(package_id, created_at DESC);

-- ────────────────────────────────────────────────────────────
-- INVENTORY
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inventory_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_product_id VARCHAR(100),
  sku VARCHAR(100),
  product_name VARCHAR(255),
  batch_number VARCHAR(100) NOT NULL,
  lot_number VARCHAR(100),
  expiry_date DATE,
  quantity_on_hand NUMERIC(12,3) NOT NULL DEFAULT 0,
  quantity_reserved NUMERIC(12,3) NOT NULL DEFAULT 0,
  status inventory_batch_status NOT NULL DEFAULT 'available',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(sku, batch_number, lot_number)
);

CREATE INDEX IF NOT EXISTS idx_inventory_batches_sku_status ON inventory_batches(sku, status);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_expiry ON inventory_batches(expiry_date);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_batch_id UUID REFERENCES inventory_batches(id),
  order_id UUID REFERENCES pharmacy_orders(id),
  order_item_id UUID REFERENCES pharmacy_order_items(id),
  package_id UUID REFERENCES order_packages(id),
  movement_type inventory_movement_type NOT NULL,
  quantity_delta NUMERIC(12,3) NOT NULL,
  balance_after NUMERIC(12,3) NOT NULL,
  reason_code VARCHAR(100),
  performed_by VARCHAR(100),
  source_system VARCHAR(50) NOT NULL DEFAULT 'pharmacy_core',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_batch ON inventory_movements(inventory_batch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_order ON inventory_movements(order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_package ON inventory_movements(package_id);

-- ────────────────────────────────────────────────────────────
-- PHARMACY FINANCE, RETURNS, TICKETS, AUDIT
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pharmacy_settlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  settlement_number VARCHAR(50) UNIQUE NOT NULL,
  pharmacy_id UUID NOT NULL REFERENCES partner_pharmacies(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  gross_fee_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  return_fee_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  adjustment_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_payable NUMERIC(12,2) NOT NULL DEFAULT 0,
  status pharmacy_settlement_status NOT NULL DEFAULT 'draft',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pharmacy_settlements_pharmacy ON pharmacy_settlements(pharmacy_id, period_start, period_end);

CREATE TABLE IF NOT EXISTS pharmacy_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pharmacy_id UUID NOT NULL REFERENCES partner_pharmacies(id),
  order_id UUID NOT NULL REFERENCES pharmacy_orders(id),
  package_id UUID REFERENCES order_packages(id),
  action_type pharmacy_ledger_action NOT NULL,
  fee_earned NUMERIC(10,2) NOT NULL,
  action_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  performed_by VARCHAR(100),
  payout_status pharmacy_payout_status NOT NULL DEFAULT 'ACCRUED',
  settlement_id UUID REFERENCES pharmacy_settlements(id),
  reversal_of UUID REFERENCES pharmacy_ledger(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pharmacy_ledger_pharmacy ON pharmacy_ledger(pharmacy_id, payout_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pharmacy_ledger_order ON pharmacy_ledger(order_id);

CREATE TABLE IF NOT EXISTS return_waybills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES pharmacy_orders(id),
  package_id UUID REFERENCES order_packages(id),
  pharmacy_id UUID NOT NULL REFERENCES partner_pharmacies(id),
  waybill_number VARCHAR(100),
  courier_name VARCHAR(100),
  status return_waybill_status NOT NULL DEFAULT 'requested',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  received_at_hub_at TIMESTAMPTZ,
  created_by VARCHAR(100),
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB
);

CREATE INDEX IF NOT EXISTS idx_return_waybills_pharmacy_status ON return_waybills(pharmacy_id, status);
CREATE INDEX IF NOT EXISTS idx_return_waybills_order ON return_waybills(order_id);

CREATE TABLE IF NOT EXISTS refunds_payable (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES pharmacy_orders(id),
  payment_event_id UUID REFERENCES payment_events(id),
  patient_id UUID REFERENCES patients(id),
  amount NUMERIC(12,2) NOT NULL,
  reason_code refund_reason_code NOT NULL,
  status refund_payable_status NOT NULL DEFAULT 'pending',
  credit_note_number VARCHAR(50),
  linked_payment_reference VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_refunds_payable_status ON refunds_payable(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_refunds_payable_order ON refunds_payable(order_id);

CREATE TABLE IF NOT EXISTS workflow_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_type workflow_ticket_type NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(100) NOT NULL,
  priority workflow_ticket_priority NOT NULL DEFAULT 'medium',
  status workflow_ticket_status NOT NULL DEFAULT 'open',
  assigned_role VARCHAR(100),
  assigned_user_id VARCHAR(100),
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_workflow_tickets_status ON workflow_tickets(status, priority, due_at);
CREATE INDEX IF NOT EXISTS idx_workflow_tickets_entity ON workflow_tickets(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(100) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  actor_type VARCHAR(50) NOT NULL DEFAULT 'user',
  actor_id VARCHAR(100),
  before_state JSONB,
  after_state JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  request_id VARCHAR(100),
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON audit_events(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_event_type ON audit_events(event_type, created_at DESC);

-- ────────────────────────────────────────────────────────────
-- APPEND-ONLY GUARDS
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION prevent_append_only_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION '% is append-only; create a linked correction/reversal record instead', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_payment_events_append_only
  BEFORE UPDATE OR DELETE ON payment_events
  FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_payment_allocations_append_only
  BEFORE UPDATE OR DELETE ON payment_allocations
  FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_inventory_movements_append_only
  BEFORE UPDATE OR DELETE ON inventory_movements
  FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_package_custody_append_only
  BEFORE UPDATE OR DELETE ON package_custody_events
  FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_order_status_events_append_only
  BEFORE UPDATE OR DELETE ON order_status_events
  FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_audit_events_append_only
  BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Ledger rows can be linked to settlement, but core earned amount/action
-- must not be changed after insert. Settlement status changes are allowed.
CREATE OR REPLACE FUNCTION protect_pharmacy_ledger_core_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.pharmacy_id IS DISTINCT FROM NEW.pharmacy_id
    OR OLD.order_id IS DISTINCT FROM NEW.order_id
    OR OLD.package_id IS DISTINCT FROM NEW.package_id
    OR OLD.action_type IS DISTINCT FROM NEW.action_type
    OR OLD.fee_earned IS DISTINCT FROM NEW.fee_earned
    OR OLD.action_timestamp IS DISTINCT FROM NEW.action_timestamp
    OR OLD.performed_by IS DISTINCT FROM NEW.performed_by
    OR OLD.reversal_of IS DISTINCT FROM NEW.reversal_of
  THEN
    RAISE EXCEPTION 'pharmacy_ledger core fields are immutable; create reversal/adjustment rows instead';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_pharmacy_ledger_core_immutable
  BEFORE UPDATE ON pharmacy_ledger
  FOR EACH ROW EXECUTE FUNCTION protect_pharmacy_ledger_core_fields();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_pharmacy_ledger_no_delete
  BEFORE DELETE ON pharmacy_ledger
  FOR EACH ROW EXECUTE FUNCTION prevent_append_only_mutation();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
