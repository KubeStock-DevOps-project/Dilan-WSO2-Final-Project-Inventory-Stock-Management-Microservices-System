/**
 * Initial Migration for Supplier Service
 * Creates core tables: suppliers, purchase_orders, purchase_order_items, supplier_ratings
 */

exports.up = (pgm) => {
  // Suppliers table
  pgm.createTable('suppliers', {
    id: 'id',
    name: { type: 'varchar(255)', notNull: true },
    contact_person: { type: 'varchar(255)' },
    email: { type: 'varchar(255)' },
    phone: { type: 'varchar(50)' },
    address: { type: 'text' },
    country: { type: 'varchar(100)' },
    payment_terms: { type: 'varchar(100)' },
    rating: { type: 'decimal(3,2)', default: 0 },
    is_active: { type: 'boolean', default: true },
    asgardeo_sub: { type: 'varchar(255)', unique: true }, // Link to Asgardeo user
    total_orders: { type: 'integer', default: 0 },
    on_time_deliveries: { type: 'integer', default: 0 },
    late_deliveries: { type: 'integer', default: 0 },
    average_delivery_days: { type: 'decimal(5,2)', default: 0 },
    last_delivery_date: { type: 'date' },
    average_rating: { type: 'decimal(3,2)', default: 0 },
    total_ratings: { type: 'integer', default: 0 },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });

  pgm.createIndex('suppliers', 'email');
  pgm.createIndex('suppliers', 'asgardeo_sub');
  pgm.createIndex('suppliers', 'is_active');

  // Purchase orders table
  pgm.createTable('purchase_orders', {
    id: 'id',
    po_number: { type: 'varchar(100)', notNull: true, unique: true },
    supplier_id: {
      type: 'integer',
      notNull: true,
      references: 'suppliers',
      onDelete: 'RESTRICT',
    },
    total_amount: { type: 'decimal(12,2)', notNull: true, default: 0 },
    order_date: { type: 'timestamp', default: pgm.func('current_timestamp') },
    expected_delivery_date: { type: 'date' },
    actual_delivery_date: { type: 'date' },
    status: { type: 'varchar(50)', default: 'draft' },
    notes: { type: 'text' },
    supplier_response: { type: 'varchar(20)', notNull: true, default: 'pending' },
    requested_quantity: { type: 'integer' },
    approved_quantity: { type: 'integer' },
    rejection_reason: { type: 'text' },
    estimated_delivery_date: { type: 'date' },
    tracking_number: { type: 'varchar(100)' },
    supplier_notes: { type: 'text' },
    responded_at: { type: 'timestamp' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });

  // Add check constraints
  pgm.addConstraint('purchase_orders', 'check_status', {
    check: "status IN ('draft', 'pending', 'confirmed', 'preparing', 'shipped', 'received', 'cancelled', 'rejected')",
  });

  pgm.addConstraint('purchase_orders', 'check_supplier_response', {
    check: "supplier_response IN ('pending', 'approved', 'rejected', 'partially_approved')",
  });

  pgm.createIndex('purchase_orders', 'supplier_id');
  pgm.createIndex('purchase_orders', 'status');
  pgm.createIndex('purchase_orders', 'supplier_response');

  // Purchase order items table
  pgm.createTable('purchase_order_items', {
    id: 'id',
    po_id: {
      type: 'integer',
      notNull: true,
      references: 'purchase_orders',
      onDelete: 'CASCADE',
    },
    product_id: { type: 'integer', notNull: true },
    sku: { type: 'varchar(100)', notNull: true },
    product_name: { type: 'varchar(255)' },
    quantity: { type: 'integer', notNull: true },
    unit_price: { type: 'decimal(10,2)', notNull: true },
    total_price: { type: 'decimal(12,2)', notNull: true },
  });

  pgm.createIndex('purchase_order_items', 'po_id');
  pgm.createIndex('purchase_order_items', 'product_id');

  // Supplier ratings table
  pgm.createTable('supplier_ratings', {
    id: 'id',
    supplier_id: {
      type: 'integer',
      notNull: true,
      references: 'suppliers',
      onDelete: 'CASCADE',
    },
    purchase_order_id: {
      type: 'integer',
      notNull: true,
      references: 'purchase_orders',
      onDelete: 'CASCADE',
      unique: true, // One rating per purchase order
    },
    rating: { type: 'integer', notNull: true },
    quality_rating: { type: 'integer' },
    delivery_rating: { type: 'integer' },
    communication_rating: { type: 'integer' },
    comments: { type: 'text' },
    rated_by: { type: 'varchar(255)', notNull: true }, // Asgardeo sub or email
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });

  // Add check constraints for ratings
  pgm.addConstraint('supplier_ratings', 'check_rating', {
    check: 'rating >= 1 AND rating <= 5',
  });
  pgm.addConstraint('supplier_ratings', 'check_quality_rating', {
    check: 'quality_rating IS NULL OR (quality_rating >= 1 AND quality_rating <= 5)',
  });
  pgm.addConstraint('supplier_ratings', 'check_delivery_rating', {
    check: 'delivery_rating IS NULL OR (delivery_rating >= 1 AND delivery_rating <= 5)',
  });
  pgm.addConstraint('supplier_ratings', 'check_communication_rating', {
    check: 'communication_rating IS NULL OR (communication_rating >= 1 AND communication_rating <= 5)',
  });

  pgm.createIndex('supplier_ratings', 'supplier_id');

  // Update timestamp trigger function
  pgm.createFunction(
    'update_updated_at_column',
    [],
    { returns: 'trigger', language: 'plpgsql', replace: true },
    `
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    `
  );

  // Add triggers for updated_at
  ['suppliers', 'purchase_orders', 'supplier_ratings'].forEach((table) => {
    pgm.createTrigger(table, `update_${table}_updated_at`, {
      when: 'BEFORE',
      operation: 'UPDATE',
      function: 'update_updated_at_column',
      level: 'ROW',
    });
  });

  // Trigger to update supplier average rating when a rating is added/updated/deleted
  pgm.createFunction(
    'update_supplier_rating',
    [],
    { returns: 'trigger', language: 'plpgsql', replace: true },
    `
    BEGIN
      UPDATE suppliers 
      SET 
        average_rating = (
          SELECT COALESCE(AVG(rating), 0) 
          FROM supplier_ratings 
          WHERE supplier_id = COALESCE(NEW.supplier_id, OLD.supplier_id)
        ),
        total_ratings = (
          SELECT COUNT(*) 
          FROM supplier_ratings 
          WHERE supplier_id = COALESCE(NEW.supplier_id, OLD.supplier_id)
        )
      WHERE id = COALESCE(NEW.supplier_id, OLD.supplier_id);
      
      RETURN COALESCE(NEW, OLD);
    END;
    `
  );

  pgm.createTrigger('supplier_ratings', 'trigger_update_supplier_rating', {
    when: 'AFTER',
    operation: ['INSERT', 'UPDATE', 'DELETE'],
    function: 'update_supplier_rating',
    level: 'ROW',
  });

  // Comments
  pgm.sql("COMMENT ON COLUMN suppliers.asgardeo_sub IS 'Asgardeo user ID (sub claim from JWT)'");
  pgm.sql("COMMENT ON TABLE supplier_ratings IS 'Stores performance ratings for suppliers'");
};

exports.down = (pgm) => {
  pgm.dropTrigger('supplier_ratings', 'trigger_update_supplier_rating', { ifExists: true });
  ['suppliers', 'purchase_orders', 'supplier_ratings'].forEach((table) => {
    pgm.dropTrigger(table, `update_${table}_updated_at`, { ifExists: true });
  });
  
  pgm.dropFunction('update_supplier_rating', [], { ifExists: true });
  pgm.dropFunction('update_updated_at_column', [], { ifExists: true });
  pgm.dropTable('supplier_ratings', { ifExists: true });
  pgm.dropTable('purchase_order_items', { ifExists: true });
  pgm.dropTable('purchase_orders', { ifExists: true });
  pgm.dropTable('suppliers', { ifExists: true });
};
