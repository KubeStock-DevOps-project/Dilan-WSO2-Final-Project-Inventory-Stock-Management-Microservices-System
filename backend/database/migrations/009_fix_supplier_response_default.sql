-- Migration: Fix supplier_response default value
-- Purpose: Ensure all purchase orders have supplier_response set to 'pending' by default
-- Date: 2025-11-19

\c supplier_db;

-- Set default value for supplier_response column
ALTER TABLE purchase_orders 
  ALTER COLUMN supplier_response SET DEFAULT 'pending';

-- Update all existing NULL supplier_response values to 'pending'
UPDATE purchase_orders 
SET supplier_response = 'pending' 
WHERE supplier_response IS NULL;

-- Make supplier_response NOT NULL since it should always have a value
ALTER TABLE purchase_orders 
  ALTER COLUMN supplier_response SET NOT NULL;

COMMENT ON COLUMN purchase_orders.supplier_response IS 'Supplier response to purchase request: pending (default), approved, rejected, partially_approved';
