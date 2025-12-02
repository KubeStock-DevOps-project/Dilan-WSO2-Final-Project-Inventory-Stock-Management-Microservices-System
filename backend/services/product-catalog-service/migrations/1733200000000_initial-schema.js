/**
 * Initial Migration for Product Catalog Service
 * Creates core tables: categories, products
 */

exports.up = (pgm) => {
  // Categories table
  pgm.createTable('categories', {
    id: 'id',
    name: { type: 'varchar(255)', notNull: true },
    description: { type: 'text' },
    code: { type: 'varchar(10)' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });

  pgm.createIndex('categories', 'code', { unique: true, where: 'code IS NOT NULL' });

  // Products table
  pgm.createTable('products', {
    id: 'id',
    sku: { type: 'varchar(100)', notNull: true, unique: true },
    name: { type: 'varchar(255)', notNull: true },
    description: { type: 'text' },
    category_id: {
      type: 'integer',
      references: 'categories',
      onDelete: 'SET NULL',
    },
    size: { type: 'varchar(50)' },
    color: { type: 'varchar(50)' },
    unit_price: { type: 'decimal(10,2)', notNull: true, default: 0 },
    attributes: { type: 'jsonb', default: '{}' },
    is_active: { type: 'boolean', default: true },
    lifecycle_state: { type: 'varchar(50)', default: 'draft' },
    created_by: { type: 'varchar(255)' }, // Asgardeo sub or email
    approved_by: { type: 'varchar(255)' },
    approved_at: { type: 'timestamp' },
    average_rating: { type: 'decimal(3,2)', default: 0 },
    total_ratings: { type: 'integer', default: 0 },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });

  pgm.createIndex('products', 'category_id');
  pgm.createIndex('products', 'lifecycle_state');
  pgm.createIndex('products', 'is_active');

  // Pricing rules table
  pgm.createTable('pricing_rules', {
    id: 'id',
    rule_name: { type: 'varchar(255)', notNull: true },
    rule_type: { type: 'varchar(50)', notNull: true }, // 'bulk', 'promotion', 'category'
    product_id: {
      type: 'integer',
      references: 'products',
      onDelete: 'CASCADE',
    },
    category_id: {
      type: 'integer',
      references: 'categories',
      onDelete: 'CASCADE',
    },
    min_quantity: { type: 'integer', default: 1 },
    discount_percentage: { type: 'decimal(5,2)', notNull: true },
    promo_name: { type: 'varchar(255)' },
    valid_from: { type: 'date' },
    valid_until: { type: 'date' },
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });

  pgm.createIndex('pricing_rules', 'product_id');
  pgm.createIndex('pricing_rules', 'category_id');
  pgm.createIndex('pricing_rules', 'rule_type');
  pgm.createIndex('pricing_rules', 'is_active');

  // Product lifecycle history table
  pgm.createTable('product_lifecycle_history', {
    id: 'id',
    product_id: {
      type: 'integer',
      notNull: true,
      references: 'products',
      onDelete: 'CASCADE',
    },
    old_state: { type: 'varchar(50)' },
    new_state: { type: 'varchar(50)', notNull: true },
    changed_by: { type: 'varchar(255)', notNull: true }, // Asgardeo sub or email
    changed_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    notes: { type: 'text' },
  });

  pgm.createIndex('product_lifecycle_history', 'product_id');

  // Product bundles table
  pgm.createTable('product_bundles', {
    id: 'id',
    bundle_name: { type: 'varchar(255)', notNull: true },
    description: { type: 'text' },
    bundle_discount_percentage: { type: 'decimal(5,2)', default: 0 },
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });

  // Product bundle items table
  pgm.createTable('product_bundle_items', {
    id: 'id',
    bundle_id: {
      type: 'integer',
      notNull: true,
      references: 'product_bundles',
      onDelete: 'CASCADE',
    },
    product_id: {
      type: 'integer',
      notNull: true,
      references: 'products',
      onDelete: 'CASCADE',
    },
    quantity: { type: 'integer', default: 1 },
  });

  pgm.addConstraint('product_bundle_items', 'unique_bundle_product', {
    unique: ['bundle_id', 'product_id'],
  });

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
  ['products', 'categories', 'pricing_rules', 'product_bundles'].forEach((table) => {
    pgm.createTrigger(table, `update_${table}_updated_at`, {
      when: 'BEFORE',
      operation: 'UPDATE',
      function: 'update_updated_at_column',
      level: 'ROW',
    });
  });
};

exports.down = (pgm) => {
  ['products', 'categories', 'pricing_rules', 'product_bundles'].forEach((table) => {
    pgm.dropTrigger(table, `update_${table}_updated_at`, { ifExists: true });
  });
  
  pgm.dropFunction('update_updated_at_column', [], { ifExists: true });
  pgm.dropTable('product_bundle_items', { ifExists: true });
  pgm.dropTable('product_bundles', { ifExists: true });
  pgm.dropTable('product_lifecycle_history', { ifExists: true });
  pgm.dropTable('pricing_rules', { ifExists: true });
  pgm.dropTable('products', { ifExists: true });
  pgm.dropTable('categories', { ifExists: true });
};
