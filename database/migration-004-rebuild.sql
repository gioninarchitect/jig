-- Migration 004: Drop and recreate all tables from clean schema
-- The production DB had an incomplete initial schema. This fixes it.
-- All data will be re-seeded after this migration.

DROP TABLE IF EXISTS event_log CASCADE;
DROP TABLE IF EXISTS interventions CASCADE;
DROP TABLE IF EXISTS client_patterns CASCADE;
DROP TABLE IF EXISTS client_world_state CASCADE;
DROP TABLE IF EXISTS pop_uploads CASCADE;
DROP TABLE IF EXISTS order_sequences CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS product_price_tiers CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS auth_sessions CASCADE;
DROP TABLE IF EXISTS auth_otp CASCADE;

-- Drop types
DROP TYPE IF EXISTS order_status CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;
DROP TYPE IF EXISTS payment_method CASCADE;
DROP TYPE IF EXISTS client_type CASCADE;
DROP TYPE IF EXISTS client_tier CASCADE;
DROP TYPE IF EXISTS client_status CASCADE;
