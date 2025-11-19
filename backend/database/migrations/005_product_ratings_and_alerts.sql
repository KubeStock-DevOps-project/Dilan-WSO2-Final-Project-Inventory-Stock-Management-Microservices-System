-- Add product ratings table for suppliers to rate products
\c product_catalog_db;

CREATE TABLE IF NOT EXISTS product_ratings (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    supplier_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, supplier_id)
);

CREATE INDEX idx_product_ratings_product ON product_ratings(product_id);
CREATE INDEX idx_product_ratings_supplier ON product_ratings(supplier_id);

-- Add average rating to products (computed column)
ALTER TABLE products ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3, 2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS total_ratings INTEGER DEFAULT 0;

-- Add low stock alerts table
\c inventory_db;

CREATE TABLE IF NOT EXISTS low_stock_alerts (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    sku VARCHAR(50) NOT NULL,
    current_quantity INTEGER NOT NULL,
    reorder_level INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'ignored')),
    alerted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    resolved_by INTEGER
);

CREATE INDEX idx_low_stock_alerts_product ON low_stock_alerts(product_id);
CREATE INDEX idx_low_stock_alerts_status ON low_stock_alerts(status);

-- Add supplier performance metrics
\c supplier_db;

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS on_time_deliveries INTEGER DEFAULT 0;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS late_deliveries INTEGER DEFAULT 0;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS average_delivery_days DECIMAL(5, 2) DEFAULT 0;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS last_delivery_date DATE;

-- Function to update supplier performance
CREATE OR REPLACE FUNCTION update_supplier_performance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'received' AND (OLD.status IS NULL OR OLD.status != 'received') THEN
        -- Update total orders
        UPDATE suppliers 
        SET total_orders = total_orders + 1,
            last_delivery_date = NEW.actual_delivery_date
        WHERE id = NEW.supplier_id;
        
        -- Check if delivery was on time
        IF NEW.actual_delivery_date <= NEW.expected_delivery_date THEN
            UPDATE suppliers 
            SET on_time_deliveries = on_time_deliveries + 1
            WHERE id = NEW.supplier_id;
        ELSE
            UPDATE suppliers 
            SET late_deliveries = late_deliveries + 1
            WHERE id = NEW.supplier_id;
        END IF;
        
        -- Update average delivery days
        UPDATE suppliers s
        SET average_delivery_days = (
            SELECT AVG(EXTRACT(DAY FROM (po.actual_delivery_date - po.order_date)))
            FROM purchase_orders po
            WHERE po.supplier_id = s.id AND po.status = 'received'
        )
        WHERE s.id = NEW.supplier_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for supplier performance
DROP TRIGGER IF EXISTS trigger_supplier_performance ON purchase_orders;
CREATE TRIGGER trigger_supplier_performance
AFTER UPDATE ON purchase_orders
FOR EACH ROW
EXECUTE FUNCTION update_supplier_performance();
