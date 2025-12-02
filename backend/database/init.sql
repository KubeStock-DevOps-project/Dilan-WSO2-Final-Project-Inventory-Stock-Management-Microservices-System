-- ============================================
-- PostgreSQL Database Initialization Script
-- ============================================
-- This script creates the databases for each microservice.
-- Schema and tables are managed by each service's migrations.
-- ============================================

-- Create databases for each microservice
CREATE DATABASE product_catalog_db;
CREATE DATABASE inventory_db;
CREATE DATABASE supplier_db;
CREATE DATABASE order_db;

-- Grant privileges to the postgres user (or create specific users per service if needed)
GRANT ALL PRIVILEGES ON DATABASE product_catalog_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE inventory_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE supplier_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE order_db TO postgres;

-- Note: Each microservice will run its own migrations on startup
-- to create and update the schema for its respective database.
