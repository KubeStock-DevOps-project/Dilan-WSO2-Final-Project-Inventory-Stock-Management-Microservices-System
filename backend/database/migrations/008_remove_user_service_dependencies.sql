-- ============================================
-- Migration: Add Asgardeo Sub to Suppliers
-- Date: 2025-12-01
-- Purpose: Link suppliers to Asgardeo users instead of local user_id
-- ============================================

\c supplier_db;

-- Add asgardeo_sub column for linking to Asgardeo users
ALTER TABLE suppliers 
ADD COLUMN IF NOT EXISTS asgardeo_sub VARCHAR(255);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_suppliers_asgardeo_sub 
ON suppliers(asgardeo_sub);

-- Add unique constraint to prevent duplicate supplier profiles per Asgardeo user
-- ALTER TABLE suppliers ADD CONSTRAINT unique_asgardeo_sub UNIQUE (asgardeo_sub);

-- Drop old user_id column if it exists (no longer needed)
-- Uncomment after verifying no data loss
-- ALTER TABLE suppliers DROP COLUMN IF EXISTS user_id;

-- ============================================
-- Stock Movements Audit Trail Update
-- ============================================

\c inventory_db;

-- Change performed_by to store Asgardeo sub or email (string) instead of integer user_id
-- For existing data, this will convert any existing integer IDs to strings
ALTER TABLE stock_movements 
ALTER COLUMN performed_by TYPE VARCHAR(255) USING performed_by::VARCHAR;

-- Add comment for documentation
COMMENT ON COLUMN stock_movements.performed_by IS 'Asgardeo sub or email of user who performed the action';

-- ============================================
-- Notes:
-- - User authentication is now handled by Asgardeo
-- - No local users table needed
-- - Suppliers are linked via email or asgardeo_sub
-- - Audit trails use Asgardeo identifiers
-- ============================================
