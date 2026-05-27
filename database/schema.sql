-- ============================================================
-- PureGro Premium Cannabis Care - HEADCASE EVOLVE Database Schema
-- PostgreSQL 15+
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- OTP EMAIL AUTHENTICATION
-- ────────────────────────────────────────────────────────────

-- OTP requests (short-lived, cleaned up periodically)
CREATE TABLE auth_otp (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) NOT NULL,
    otp_code        VARCHAR(6) NOT NULL,
    purpose         VARCHAR(20) NOT NULL DEFAULT 'login', -- login | register | reset
    attempts        INTEGER NOT NULL DEFAULT 0,
    max_attempts    INTEGER NOT NULL DEFAULT 3,
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_at     TIMESTAMPTZ
);

CREATE INDEX idx_otp_email ON auth_otp (email);
CREATE INDEX idx_otp_expires ON auth_otp (expires_at);
CREATE INDEX idx_otp_lookup ON auth_otp (email, otp_code, is_verified);

-- Active sessions (JWT tracking + revocation)
CREATE TABLE auth_sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id       UUID NOT NULL,  -- FK added after clients table
    token_hash      VARCHAR(64) NOT NULL UNIQUE,
    user_agent      TEXT,
    ip_address      VARCHAR(45),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL,
    last_used_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_client ON auth_sessions (client_id);
CREATE INDEX idx_sessions_active ON auth_sessions (is_active, expires_at);
CREATE INDEX idx_sessions_token ON auth_sessions (token_hash);

-- ────────────────────────────────────────────────────────────
-- ENUM TYPES
-- ────────────────────────────────────────────────────────────

CREATE TYPE client_tier AS ENUM ('standard', 'silver', 'gold', 'platinum');
CREATE TYPE client_status AS ENUM ('pending', 'active', 'suspended', 'churned');
CREATE TYPE client_type AS ENUM ('dispensary', 'retailer', 'distributor', 'cafe', 'online_store');
CREATE TYPE payment_terms AS ENUM ('cod', 'net7', 'net14', 'net30');
CREATE TYPE payment_status AS ENUM ('pending', 'partial', 'paid', 'overdue', 'refunded');
CREATE TYPE payment_method AS ENUM ('eft', 'card', 'cash', 'credit');
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled');
CREATE TYPE product_category AS ENUM ('flower', 'pre_rolls', 'edibles', 'concentrates', 'vapes', 'accessories');
CREATE TYPE strain_type AS ENUM ('sativa', 'indica', 'hybrid', 'na');
CREATE TYPE churn_risk AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE intervention_type AS ENUM ('reorder_reminder', 'churn_prevention', 'payment_reminder', 'upsell', 'welcome', 'win_back', 'vip_offer');
CREATE TYPE intervention_channel AS ENUM ('email', 'sms', 'in_app', 'whatsapp', 'sales_call');
CREATE TYPE intervention_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE intervention_status AS ENUM ('pending', 'sent', 'opened', 'clicked', 'converted', 'ignored');
CREATE TYPE intervention_outcome AS ENUM ('success', 'partial', 'failed', 'pending');
CREATE TYPE pattern_category AS ENUM ('purchasing', 'payment', 'engagement', 'risk');

-- ────────────────────────────────────────────────────────────
-- CLIENTS
-- ────────────────────────────────────────────────────────────

CREATE TABLE clients (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name    VARCHAR(255) NOT NULL,
    trading_name    VARCHAR(255),
    registration_number VARCHAR(50),
    vat_number      VARCHAR(20),
    contact_person  VARCHAR(255) NOT NULL,
    email           VARCHAR(255) NOT NULL UNIQUE,
    phone           VARCHAR(20) NOT NULL,

    -- Billing address
    address_street      VARCHAR(255) NOT NULL,
    address_city        VARCHAR(100) NOT NULL,
    address_province    VARCHAR(50) NOT NULL,
    address_postal_code VARCHAR(10) NOT NULL,
    address_country     VARCHAR(50) NOT NULL DEFAULT 'South Africa',

    -- Delivery address (nullable, falls back to billing)
    delivery_street      VARCHAR(255),
    delivery_city        VARCHAR(100),
    delivery_province    VARCHAR(50),
    delivery_postal_code VARCHAR(10),
    delivery_country     VARCHAR(50),

    client_type     client_type NOT NULL DEFAULT 'dispensary',
    tier            client_tier NOT NULL DEFAULT 'standard',
    credit_limit    NUMERIC(12, 2) NOT NULL DEFAULT 0,
    payment_terms   payment_terms NOT NULL DEFAULT 'cod',
    status          client_status NOT NULL DEFAULT 'pending',

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clients_status ON clients (status);
CREATE INDEX idx_clients_tier ON clients (tier);
CREATE INDEX idx_clients_province ON clients (address_province);

-- Add FK from auth_sessions to clients (deferred because clients created after auth tables)
ALTER TABLE auth_sessions
    ADD CONSTRAINT fk_sessions_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

-- ────────────────────────────────────────────────────────────
-- PRODUCTS
-- ────────────────────────────────────────────────────────────

CREATE TABLE products (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku             VARCHAR(50) NOT NULL UNIQUE,
    name            VARCHAR(255) NOT NULL,
    category        product_category NOT NULL,
    subcategory     VARCHAR(100),
    strain          strain_type DEFAULT 'na',
    thc_content     VARCHAR(20),
    cbd_content     VARCHAR(20),
    description     TEXT,
    unit            VARCHAR(20) NOT NULL DEFAULT 'grams',
    stock_quantity  INTEGER NOT NULL DEFAULT 0,
    reorder_point   INTEGER NOT NULL DEFAULT 0,
    cost_price      NUMERIC(10, 2) NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_category ON products (category);
CREATE INDEX idx_products_active ON products (is_active);
CREATE INDEX idx_products_sku ON products (sku);

-- Price tiers per product
CREATE TABLE product_price_tiers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    min_quantity    INTEGER NOT NULL,
    price           NUMERIC(10, 2) NOT NULL,
    tier_name       VARCHAR(100) NOT NULL,

    UNIQUE (product_id, tier_name)
);

CREATE INDEX idx_price_tiers_product ON product_price_tiers (product_id);

-- ────────────────────────────────────────────────────────────
-- ORDERS
-- ────────────────────────────────────────────────────────────

CREATE TABLE orders (
    id                  VARCHAR(20) PRIMARY KEY, -- PureGro-XXXXXX
    client_id           UUID NOT NULL REFERENCES clients(id),
    subtotal            NUMERIC(12, 2) NOT NULL,
    vat_amount          NUMERIC(12, 2) NOT NULL,
    total               NUMERIC(12, 2) NOT NULL,
    status              order_status NOT NULL DEFAULT 'pending',
    payment_status      payment_status NOT NULL DEFAULT 'pending',
    payment_method      payment_method NOT NULL DEFAULT 'eft',
    payment_due_date    TIMESTAMPTZ,
    paid_at             TIMESTAMPTZ,

    -- PO & Invoice
    po_number           VARCHAR(20),
    invoice_number      VARCHAR(20),

    -- Delivery
    delivery_street      VARCHAR(255) NOT NULL,
    delivery_city        VARCHAR(100) NOT NULL,
    delivery_province    VARCHAR(50) NOT NULL,
    delivery_postal_code VARCHAR(10) NOT NULL,
    delivery_country     VARCHAR(50) NOT NULL DEFAULT 'South Africa',
    delivery_notes       TEXT,
    tracking_number      VARCHAR(100),
    courier_name         VARCHAR(100),

    -- Status timestamps
    confirmed_at        TIMESTAMPTZ,
    shipped_at          TIMESTAMPTZ,
    delivered_at        TIMESTAMPTZ,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_client ON orders (client_id);
CREATE INDEX idx_orders_status ON orders (status);
CREATE INDEX idx_orders_payment_status ON orders (payment_status);
CREATE INDEX idx_orders_created ON orders (created_at DESC);

-- Order line items
CREATE TABLE order_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id        VARCHAR(20) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id      UUID NOT NULL REFERENCES products(id),
    sku             VARCHAR(50) NOT NULL,
    name            VARCHAR(255) NOT NULL,
    quantity        INTEGER NOT NULL,
    unit_price      NUMERIC(10, 2) NOT NULL,
    total_price     NUMERIC(12, 2) NOT NULL
);

CREATE INDEX idx_order_items_order ON order_items (order_id);

-- Sequence table for auto-incrementing PO/INV numbers
CREATE TABLE order_sequences (
    sequence_name VARCHAR(50) PRIMARY KEY,
    current_value INTEGER NOT NULL DEFAULT 0
);
INSERT INTO order_sequences VALUES ('po', 0), ('invoice', 0);

-- Proof of Payment uploads
CREATE TABLE pop_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id VARCHAR(20) NOT NULL REFERENCES orders(id),
    client_id UUID NOT NULL REFERENCES clients(id),
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
    admin_notes TEXT,
    reviewed_by UUID REFERENCES clients(id),
    reviewed_at TIMESTAMPTZ,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pop_order ON pop_uploads (order_id);
CREATE INDEX idx_pop_status ON pop_uploads (status);

-- ────────────────────────────────────────────────────────────
-- CLIENT WORLD STATE (Intelligence Core)
-- ────────────────────────────────────────────────────────────

CREATE TABLE client_world_state (
    client_id       UUID PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,

    -- Purchasing
    lifetime_value          NUMERIC(14, 2) NOT NULL DEFAULT 0,
    total_orders            INTEGER NOT NULL DEFAULT 0,
    average_order_value     NUMERIC(12, 2) NOT NULL DEFAULT 0,
    last_order_at           TIMESTAMPTZ,
    last_order_value        NUMERIC(12, 2) NOT NULL DEFAULT 0,
    order_frequency_days    NUMERIC(8, 2) NOT NULL DEFAULT 30,
    preferred_products      JSONB NOT NULL DEFAULT '[]'::JSONB,
    preferred_categories    JSONB NOT NULL DEFAULT '[]'::JSONB,
    price_point_sensitivity VARCHAR(10) NOT NULL DEFAULT 'mixed',
    bulk_buyer              BOOLEAN NOT NULL DEFAULT FALSE,
    seasonal_pattern        VARCHAR(50),

    -- Payment
    total_paid              NUMERIC(14, 2) NOT NULL DEFAULT 0,
    outstanding_balance     NUMERIC(12, 2) NOT NULL DEFAULT 0,
    payment_reliability     NUMERIC(5, 4) NOT NULL DEFAULT 1.0,
    average_days_to_payment NUMERIC(8, 2) NOT NULL DEFAULT 0,
    late_payments           INTEGER NOT NULL DEFAULT 0,
    credit_utilization      NUMERIC(5, 4) NOT NULL DEFAULT 0,
    last_payment_at         TIMESTAMPTZ,
    payment_trend           VARCHAR(10) NOT NULL DEFAULT 'stable',

    -- Inventory (estimated at client premises)
    estimated_stock_days        NUMERIC(8, 2) NOT NULL DEFAULT 30,
    last_restock_date           TIMESTAMPTZ,
    average_consumption_rate    NUMERIC(10, 4) NOT NULL DEFAULT 0,
    stock_alerts                JSONB NOT NULL DEFAULT '[]'::JSONB,
    reorder_predictions         JSONB NOT NULL DEFAULT '[]'::JSONB,

    -- Relationship
    account_age_days        INTEGER NOT NULL DEFAULT 0,
    tier                    client_tier NOT NULL DEFAULT 'standard',
    satisfaction_score      NUMERIC(4, 2) NOT NULL DEFAULT 7.0,
    support_tickets         INTEGER NOT NULL DEFAULT 0,
    complaints_count        INTEGER NOT NULL DEFAULT 0,
    nps_score               NUMERIC(4, 2),
    churn_risk              churn_risk NOT NULL DEFAULT 'low',
    last_contact_at         TIMESTAMPTZ,
    assigned_sales_rep      VARCHAR(255),

    -- Behavioral
    preferred_order_day     VARCHAR(15) NOT NULL DEFAULT 'no_pattern',
    preferred_order_time    VARCHAR(15) NOT NULL DEFAULT 'no_pattern',
    browsing_history        JSONB NOT NULL DEFAULT '[]'::JSONB,
    cart_abandonment        INTEGER NOT NULL DEFAULT 0,
    cart_abandonment_value  NUMERIC(12, 2) NOT NULL DEFAULT 0,
    email_open_rate         NUMERIC(5, 4) NOT NULL DEFAULT 0.5,
    promotion_response_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.3,
    last_login_at           TIMESTAMPTZ,
    session_count           INTEGER NOT NULL DEFAULT 0,
    average_session_minutes NUMERIC(8, 2) NOT NULL DEFAULT 0,

    -- Metadata
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_updated            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cws_churn_risk ON client_world_state (churn_risk);
CREATE INDEX idx_cws_tier ON client_world_state (tier);

-- ────────────────────────────────────────────────────────────
-- CLIENT PATTERNS
-- ────────────────────────────────────────────────────────────

CREATE TABLE client_patterns (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    pattern_type    VARCHAR(50) NOT NULL,
    category        pattern_category NOT NULL,
    frequency       INTEGER NOT NULL DEFAULT 1,
    confidence      NUMERIC(5, 4) NOT NULL,
    last_detected   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    evidence        TEXT,

    UNIQUE (client_id, pattern_type)
);

CREATE INDEX idx_patterns_client ON client_patterns (client_id);
CREATE INDEX idx_patterns_category ON client_patterns (category);

-- ────────────────────────────────────────────────────────────
-- INTERVENTIONS
-- ────────────────────────────────────────────────────────────

CREATE TABLE interventions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    type            intervention_type NOT NULL,
    channel         intervention_channel NOT NULL,
    priority        intervention_priority NOT NULL,
    triggered_by    VARCHAR(100) NOT NULL,
    message         TEXT NOT NULL,
    status          intervention_status NOT NULL DEFAULT 'pending',
    triggered_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at    TIMESTAMPTZ,
    outcome         intervention_outcome DEFAULT 'pending'
);

CREATE INDEX idx_interventions_client ON interventions (client_id);
CREATE INDEX idx_interventions_status ON interventions (status);
CREATE INDEX idx_interventions_type ON interventions (type);
CREATE INDEX idx_interventions_triggered ON interventions (triggered_at DESC);

-- ────────────────────────────────────────────────────────────
-- EVENT LOG (Immutable audit trail)
-- ────────────────────────────────────────────────────────────

CREATE TABLE event_log (
    id              BIGSERIAL PRIMARY KEY,
    client_id       UUID NOT NULL REFERENCES clients(id),
    event_type      VARCHAR(50) NOT NULL,
    payload         JSONB NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_client ON event_log (client_id);
CREATE INDEX idx_events_type ON event_log (event_type);
CREATE INDEX idx_events_created ON event_log (created_at DESC);

-- ────────────────────────────────────────────────────────────
-- LEADS (From directory / lead generation list)
-- ────────────────────────────────────────────────────────────

CREATE TABLE leads (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_name       VARCHAR(255) NOT NULL,
    contact_name        VARCHAR(255),
    phone               VARCHAR(20),
    email               VARCHAR(255),
    whatsapp            VARCHAR(20),
    instagram           VARCHAR(100),
    website             VARCHAR(255),
    province            VARCHAR(50),
    city                VARCHAR(100),
    address             TEXT,
    business_type       VARCHAR(50), -- Social Club / Dispensary / Medical / Online
    tier                CHAR(1) NOT NULL DEFAULT 'D', -- A/B/C/D
    est_monthly_volume  VARCHAR(50),
    current_supplier    VARCHAR(255),
    first_contact_date  TIMESTAMPTZ,
    last_contact_date   TIMESTAMPTZ,
    status              VARCHAR(30) NOT NULL DEFAULT 'new', -- new/contacted/qualified/proposal/won/lost
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leads_tier ON leads (tier);
CREATE INDEX idx_leads_status ON leads (status);
CREATE INDEX idx_leads_province ON leads (province);

-- ────────────────────────────────────────────────────────────
-- HELPER: Updated-at trigger
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_updated   BEFORE UPDATE ON products           FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_orders_updated     BEFORE UPDATE ON orders             FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_cws_updated        BEFORE UPDATE ON client_world_state FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_leads_updated      BEFORE UPDATE ON leads              FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ────────────────────────────────────────────────────────────
-- AUTH CLEANUP: Remove expired OTPs and sessions
-- Run via pg_cron or application-level scheduler
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION cleanup_expired_auth()
RETURNS void AS $$
BEGIN
    -- Delete expired and unverified OTPs older than 1 hour
    DELETE FROM auth_otp WHERE expires_at < NOW() - INTERVAL '1 hour';

    -- Deactivate expired sessions
    UPDATE auth_sessions SET is_active = FALSE WHERE expires_at < NOW() AND is_active = TRUE;

    -- Delete inactive sessions older than 30 days
    DELETE FROM auth_sessions WHERE is_active = FALSE AND expires_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
