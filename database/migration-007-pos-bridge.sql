-- Migration 007: Add POS bridge columns to orders table
-- Links B2B wholesale orders to POS stock transfers

ALTER TABLE orders ADD COLUMN IF NOT EXISTS pos_transfer_id VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pos_transfer_number VARCHAR(50);
