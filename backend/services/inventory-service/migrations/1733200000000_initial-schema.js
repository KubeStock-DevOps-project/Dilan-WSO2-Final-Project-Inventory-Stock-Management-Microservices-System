/**
 * Initial Migration for Inventory Service
 * Creates core tables: inventory, stock_movements, stock_alerts, reorder_suggestions
 */

exports.up = (pgm) => {
  // Inventory table
  pgm.createTable('inventory', {
    id: 'id',
    product_id: { type: 'integer', notNull: true },
    sku: { type: 'varchar(100)', notNull: true },
    quantity: { type: 'integer', notNull: true, default: 0 },
    reserved_quantity: { type: 'integer', default: 0 },
    warehouse_location: { type: 'varchar(100)' },
    reorder_level: { type: 'integer', default: 10 },
    max_stock_level: { type: 'integer', default: 1000 },
    last_restocked_at: { type: 'timestamp' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });

  pgm.createIndex('inventory', 'product_id', { unique: true });
  pgm.createIndex('inventory', 'sku');
  pgm.createIndex('inventory', 'quantity');
  pgm.createIndex('inventory', 'reserved_quantity');

  // Stock movements table (audit trail)
  pgm.createTable('stock_movements', {
    id: 'id',
    product_id: { type: 'integer', notNull: true },
    sku: { type: 'varchar(100)', notNull: true },
    movement_type: { type: 'varchar(50)', notNull: true }, // 'in', 'out', 'adjustment', 'reserve', 'release'
    quantity: { type: 'integer', notNull: true },
    reference_type: { type: 'varchar(50)' }, // 'order', 'purchase_order', 'adjustment', 'return'
    reference_id: { type: 'integer' },
    notes: { type: 'text' },
    performed_by: { type: 'varchar(255)' }, // Asgardeo sub or email
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });

  pgm.createIndex('stock_movements', 'product_id');
  pgm.createIndex('stock_movements', 'movement_type');
  pgm.createIndex('stock_movements', 'created_at');

  // Stock alerts table
  pgm.createTable('stock_alerts', {
    id: 'id',
    product_id: { type: 'integer', notNull: true },
    sku: { type: 'varchar(100)', notNull: true },
    current_quantity: { type: 'integer', notNull: true },
    reorder_level: { type: 'integer', notNull: true },
    alert_type: { type: 'varchar(50)', notNull: true }, // 'low_stock', 'out_of_stock', 'overstock'
    status: { type: 'varchar(50)', default: 'active' }, // 'active', 'resolved', 'ignored'
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });

  pgm.addConstraint('stock_alerts', 'unique_product_alert_type', {
    unique: ['product_id', 'alert_type'],
  });

  pgm.createIndex('stock_alerts', 'product_id');
  pgm.createIndex('stock_alerts', 'status');

  // Reorder suggestions table
  pgm.createTable('reorder_suggestions', {
    id: 'id',
    product_id: { type: 'integer', notNull: true },
    sku: { type: 'varchar(100)', notNull: true },
    current_quantity: { type: 'integer', notNull: true },
    suggested_quantity: { type: 'integer', notNull: true },
    status: { type: 'varchar(50)', default: 'pending' }, // 'pending', 'approved', 'rejected', 'ordered'
    processed_at: { type: 'timestamp' },
    processed_by: { type: 'varchar(255)' }, // Asgardeo sub or email
    notes: { type: 'text' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });

  pgm.createIndex('reorder_suggestions', 'product_id');
  pgm.createIndex('reorder_suggestions', 'status');

  // Low stock alerts table (for notifications)
  pgm.createTable('low_stock_alerts', {
    id: 'id',
    product_id: { type: 'integer', notNull: true },
    sku: { type: 'varchar(50)', notNull: true },
    current_quantity: { type: 'integer', notNull: true },
    reorder_level: { type: 'integer', notNull: true },
    status: { type: 'varchar(20)', default: 'active' },
    alerted_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    resolved_at: { type: 'timestamp' },
    resolved_by: { type: 'varchar(255)' }, // Asgardeo sub or email
  });

  pgm.addConstraint('low_stock_alerts', 'check_status', {
    check: "status IN ('active', 'resolved', 'ignored')",
  });

  pgm.createIndex('low_stock_alerts', 'product_id');
  pgm.createIndex('low_stock_alerts', 'status');

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
  ['inventory', 'stock_alerts', 'reorder_suggestions'].forEach((table) => {
    pgm.createTrigger(table, `update_${table}_updated_at`, {
      when: 'BEFORE',
      operation: 'UPDATE',
      function: 'update_updated_at_column',
      level: 'ROW',
    });
  });

  // Comments
  pgm.sql("COMMENT ON COLUMN inventory.reserved_quantity IS 'Quantity reserved for pending orders'");
  pgm.sql("COMMENT ON TABLE stock_alerts IS 'Tracks low stock and other inventory alerts'");
  pgm.sql("COMMENT ON TABLE stock_movements IS 'Audit trail for all inventory changes'");
};

exports.down = (pgm) => {
  ['inventory', 'stock_alerts', 'reorder_suggestions'].forEach((table) => {
    pgm.dropTrigger(table, `update_${table}_updated_at`, { ifExists: true });
  });
  
  pgm.dropFunction('update_updated_at_column', [], { ifExists: true });
  pgm.dropTable('low_stock_alerts', { ifExists: true });
  pgm.dropTable('reorder_suggestions', { ifExists: true });
  pgm.dropTable('stock_alerts', { ifExists: true });
  pgm.dropTable('stock_movements', { ifExists: true });
  pgm.dropTable('inventory', { ifExists: true });
};
