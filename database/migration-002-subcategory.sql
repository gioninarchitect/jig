-- Migration 002: Add subcategory column + fix price tier constraint
-- Run: psql $DATABASE_URL -f database/migration-002-subcategory.sql

ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory VARCHAR(100);

-- Change unique constraint from (product_id, min_quantity) to (product_id, tier_name)
-- This supports client-tier pricing where multiple tiers share the same min_quantity
ALTER TABLE product_price_tiers DROP CONSTRAINT IF EXISTS product_price_tiers_product_id_min_quantity_key;
ALTER TABLE product_price_tiers ADD CONSTRAINT product_price_tiers_product_id_tier_name_key UNIQUE (product_id, tier_name);
