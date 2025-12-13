/**
 * Initial Migration for Supplier Service
 * Creates core tables: purchase_orders, purchase_order_items
 * Note: Suppliers are now managed through Asgardeo identity service
 */

exports.up = (pgm) => {
  // Purchase orders table
  // supplier_id is now the Asgardeo user ID (string) instead of a database foreign key
  pgm.createTable("purchase_orders", {
    id: "id",
    po_number: { type: "varchar(100)", notNull: true, unique: true },
    supplier_id: {
      type: "varchar(255)",
      notNull: true,
      comment: "Asgardeo user ID (sub claim) of the supplier",
    },
    total_amount: { type: "decimal(12,2)", notNull: true, default: 0 },
    order_date: { type: "timestamp", default: pgm.func("current_timestamp") },
    expected_delivery_date: { type: "date" },
    actual_delivery_date: { type: "date" },
    status: { type: "varchar(50)", default: "draft" },
    notes: { type: "text" },
    supplier_response: {
      type: "varchar(20)",
      notNull: true,
      default: "pending",
    },
    requested_quantity: { type: "integer" },
    approved_quantity: { type: "integer" },
    rejection_reason: { type: "text" },
    estimated_delivery_date: { type: "date" },
    tracking_number: { type: "varchar(100)" },
    supplier_notes: { type: "text" },
    responded_at: { type: "timestamp" },
    created_at: { type: "timestamp", default: pgm.func("current_timestamp") },
    updated_at: { type: "timestamp", default: pgm.func("current_timestamp") },
  });

  // Add check constraints
  pgm.addConstraint("purchase_orders", "check_status", {
    check:
      "status IN ('draft', 'pending', 'confirmed', 'preparing', 'shipped', 'received', 'cancelled', 'rejected')",
  });

  pgm.addConstraint("purchase_orders", "check_supplier_response", {
    check:
      "supplier_response IN ('pending', 'approved', 'rejected', 'partially_approved')",
  });

  pgm.createIndex("purchase_orders", "supplier_id");
  pgm.createIndex("purchase_orders", "status");
  pgm.createIndex("purchase_orders", "supplier_response");

  pgm.sql(
    "COMMENT ON COLUMN purchase_orders.supplier_id IS 'Asgardeo user ID (sub claim from JWT) of the supplier'"
  );

  // Purchase order items table
  pgm.createTable("purchase_order_items", {
    id: "id",
    po_id: {
      type: "integer",
      notNull: true,
      references: "purchase_orders",
      onDelete: "CASCADE",
    },
    product_id: { type: "integer", notNull: true },
    sku: { type: "varchar(100)", notNull: true },
    product_name: { type: "varchar(255)" },
    quantity: { type: "integer", notNull: true },
    unit_price: { type: "decimal(10,2)", notNull: true },
    total_price: { type: "decimal(12,2)", notNull: true },
  });

  pgm.createIndex("purchase_order_items", "po_id");
  pgm.createIndex("purchase_order_items", "product_id");

  // Update timestamp trigger function
  pgm.createFunction(
    "update_updated_at_column",
    [],
    { returns: "trigger", language: "plpgsql", replace: true },
    `
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    `
  );

  // Add trigger for updated_at on purchase_orders
  pgm.createTrigger("purchase_orders", "update_purchase_orders_updated_at", {
    when: "BEFORE",
    operation: "UPDATE",
    function: "update_updated_at_column",
    level: "ROW",
  });
};

exports.down = (pgm) => {
  pgm.dropTrigger("purchase_orders", "update_purchase_orders_updated_at", {
    ifExists: true,
  });
  pgm.dropFunction("update_updated_at_column", [], { ifExists: true });
  pgm.dropTable("purchase_order_items", { ifExists: true });
  pgm.dropTable("purchase_orders", { ifExists: true });
};
