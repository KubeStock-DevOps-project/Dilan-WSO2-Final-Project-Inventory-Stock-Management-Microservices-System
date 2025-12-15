const db = require("../config/database");
const logger = require("../config/logger");
const axios = require("axios");

const INVENTORY_SERVICE_URL =
  process.env.INVENTORY_SERVICE_URL || "http://localhost:3003";

/**
 * Production-Grade Product Lifecycle Management
 * Handles: Product status transitions, approval workflows, SKU generation, archival
 */
class ProductLifecycleService {
  /**
   * Product lifecycle states
   */
  static STATES = {
    DRAFT: "draft",
    PENDING_APPROVAL: "pending_approval",
    APPROVED: "approved",
    ACTIVE: "active",
    DISCONTINUED: "discontinued",
    ARCHIVED: "archived",
  };

  /**
   * Valid state transitions
   */
  static TRANSITIONS = {
    draft: ["pending_approval", "archived"],
    pending_approval: ["approved", "draft"],
    approved: ["active"],
    active: ["discontinued"],
    discontinued: ["active", "archived"],
    archived: [], // Cannot transition from archived
  };

  /**
   * Create product with lifecycle management
   */
  async createProduct(productData, createdBy) {
    const client = await db.pool.connect();

    try {
      await client.query("BEGIN");

      // Generate SKU if not provided
      const sku =
        productData.sku || (await this.generateSKU(productData, client));

      // Validate SKU uniqueness
      const existingSKU = await this.checkSKUExists(sku, client);
      if (existingSKU) {
        throw new Error(`SKU ${sku} already exists`);
      }

      // Create product in DRAFT state
      const productQuery = `
        INSERT INTO products 
          (sku, name, description, category_id, size, color, unit_price, 
           attributes, lifecycle_state, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const productResult = await client.query(productQuery, [
        sku,
        productData.name,
        productData.description,
        productData.category_id,
        productData.size,
        productData.color,
        productData.unit_price,
        productData.attributes ? JSON.stringify(productData.attributes) : null,
        ProductLifecycleService.STATES.DRAFT,
        createdBy,
      ]);

      const product = productResult.rows[0];

      // Log lifecycle event
      await this.logLifecycleEvent(
        product.id,
        null,
        ProductLifecycleService.STATES.DRAFT,
        createdBy,
        "Product created",
        client
      );

      await client.query("COMMIT");
      logger.info(`Product created with lifecycle: ${sku} - ${product.name}`);

      return product;
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Error creating product with lifecycle:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Transition product to new state
   */
  async transitionState(productId, newState, userId, notes = null) {
    const client = await db.pool.connect();

    try {
      await client.query("BEGIN");

      // Get current product
      const productQuery = "SELECT * FROM products WHERE id = $1 FOR UPDATE";
      const productResult = await client.query(productQuery, [productId]);
      const product = productResult.rows[0];

      if (!product) {
        throw new Error("Product not found");
      }

      const currentState = product.lifecycle_state;

      // Validate transition
      const isValidTransition = this.validateTransition(currentState, newState);
      if (!isValidTransition) {
        throw new Error(
          `Invalid state transition: ${currentState} → ${newState}`
        );
      }

      // Special logic for state transitions
      await this.handleStateTransition(product, newState, client);

      // Update product state
      const updateQuery = `
        UPDATE products 
        SET lifecycle_state = $1, 
            updated_at = CURRENT_TIMESTAMP,
            ${
              newState === ProductLifecycleService.STATES.ACTIVE
                ? "is_active = true,"
                : ""
            }
            ${
              newState === ProductLifecycleService.STATES.DISCONTINUED ||
              newState === ProductLifecycleService.STATES.ARCHIVED
                ? "is_active = false,"
                : ""
            }
            approved_by = ${
              newState === ProductLifecycleService.STATES.APPROVED
                ? "$3"
                : "approved_by"
            },
            approved_at = ${
              newState === ProductLifecycleService.STATES.APPROVED
                ? "CURRENT_TIMESTAMP"
                : "approved_at"
            }
        WHERE id = $2
        RETURNING *
      `;

      const params = [newState, productId];
      if (newState === ProductLifecycleService.STATES.APPROVED) {
        params.push(userId);
      }

      const updateResult = await client.query(updateQuery, params);
      const updatedProduct = updateResult.rows[0];

      // Log lifecycle event
      await this.logLifecycleEvent(
        productId,
        currentState,
        newState,
        userId,
        notes,
        client
      );

      await client.query("COMMIT");
      logger.info(
        `Product ${productId} transitioned: ${currentState} → ${newState}`
      );

      return updatedProduct;
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Error transitioning product state:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Validate state transition
   */
  validateTransition(currentState, newState) {
    const validTransitions = ProductLifecycleService.TRANSITIONS[currentState];
    return validTransitions && validTransitions.includes(newState);
  }

  /**
   * Handle special logic for state transitions
   */
  async handleStateTransition(product, newState, client) {
    switch (newState) {
      case ProductLifecycleService.STATES.DISCONTINUED:
        // When discontinuing, check if there's pending inventory
        // In production, call inventory service to reserve remaining stock
        logger.info(`Discontinuing product ${product.id} - checking inventory`);
        break;

      case ProductLifecycleService.STATES.ARCHIVED:
        // Archive related data (pricing rules, etc.)
        await this.archiveRelatedData(product.id, client);
        break;

      case ProductLifecycleService.STATES.ACTIVE:
        // Validate product has all required data
        await this.validateProductForActivation(product);
        // Create inventory entry if it doesn't exist
        await this.ensureInventoryExists(product);
        break;

      default:
        break;
    }
  }

  /**
   * Validate product can be activated
   */
  async validateProductForActivation(product) {
    const errors = [];

    if (!product.unit_price || product.unit_price <= 0) {
      errors.push("Valid unit price required");
    }

    if (!product.sku) {
      errors.push("SKU required");
    }

    if (!product.category_id) {
      errors.push("Category required");
    }

    if (errors.length > 0) {
      throw new Error(`Product validation failed: ${errors.join(", ")}`);
    }
  }

  /**
   * Archive related data when archiving product
   */
  async archiveRelatedData(productId, client) {
    // Archive pricing rules
    const archiveRulesQuery = `
      UPDATE pricing_rules
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE product_id = $1
    `;
    await client.query(archiveRulesQuery, [productId]);

    logger.info(`Archived related data for product ${productId}`);
  }

  /**
   * Log lifecycle event to history
   */
  async logLifecycleEvent(
    productId,
    oldState,
    newState,
    changedBy,
    notes,
    client
  ) {
    const query = `
      INSERT INTO product_lifecycle_history 
        (product_id, old_state, new_state, changed_by, notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    await client.query(query, [
      productId,
      oldState,
      newState,
      changedBy,
      notes,
    ]);
  }

  /**
   * Get product lifecycle history
   */
  async getLifecycleHistory(productId, limit = 50) {
    const query = `
      SELECT plh.*, p.name as product_name, p.sku
      FROM product_lifecycle_history plh
      JOIN products p ON plh.product_id = p.id
      WHERE plh.product_id = $1
      ORDER BY plh.changed_at DESC
      LIMIT $2
    `;

    const result = await db.query(query, [productId, limit]);
    return result.rows;
  }

  /**
   * Generate intelligent SKU based on rules
   * Format: {CATEGORY_CODE}-{YEAR}-{SEQUENCE}
   * Example: ELE-2025-0001 (Electronics)
   */
  async generateSKU(productData, client) {
    try {
      // Get category code
      const categoryQuery = "SELECT code FROM categories WHERE id = $1";
      const categoryResult = await client.query(categoryQuery, [
        productData.category_id,
      ]);

      const categoryCode = categoryResult.rows[0]?.code || "GEN";
      const year = new Date().getFullYear();

      // Get next sequence number for this category
      const sequenceQuery = `
        SELECT COALESCE(MAX(CAST(SUBSTRING(sku FROM '${categoryCode}-${year}-(\\d+)') AS INTEGER)), 0) + 1 as next_seq
        FROM products
        WHERE sku LIKE '${categoryCode}-${year}-%'
      `;

      const sequenceResult = await client.query(sequenceQuery);
      const sequence = sequenceResult.rows[0].next_seq;

      // Generate SKU: CAT-YEAR-NNNN
      const sku = `${categoryCode}-${year}-${String(sequence).padStart(
        4,
        "0"
      )}`;

      logger.info(`Generated SKU: ${sku}`);
      return sku;
    } catch (error) {
      logger.error("Error generating SKU:", error);
      // Fallback: random SKU
      return `PROD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }
  }

  /**
   * Check if SKU already exists
   */
  async checkSKUExists(sku, client) {
    const query = "SELECT id FROM products WHERE sku = $1";
    const result = await client.query(query, [sku]);
    return result.rows.length > 0;
  }

  /**
   * Get products by lifecycle state
   */
  async getProductsByState(state, filters = {}) {
    let query = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.lifecycle_state = $1
    `;
    const params = [state];
    let paramCount = 2;

    if (filters.category_id) {
      query += ` AND p.category_id = $${paramCount}`;
      params.push(filters.category_id);
      paramCount++;
    }

    query += " ORDER BY p.updated_at DESC";

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Get pending approvals
   */
  async getPendingApprovals() {
    const query = `
      SELECT p.*, c.name as category_name,
             (SELECT COUNT(*) FROM product_lifecycle_history 
              WHERE product_id = p.id) as history_count
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.lifecycle_state = $1
      ORDER BY p.created_at ASC
    `;

    const result = await db.query(query, [
      ProductLifecycleService.STATES.PENDING_APPROVAL,
    ]);
    return result.rows;
  }

  /**
   * Bulk approve products
   */
  async bulkApprove(productIds, userId, notes = "Bulk approval") {
    const client = await db.pool.connect();
    const results = [];

    try {
      await client.query("BEGIN");

      for (const productId of productIds) {
        try {
          const updated = await this.transitionState(
            productId,
            ProductLifecycleService.STATES.APPROVED,
            userId,
            notes
          );
          results.push({ productId, success: true, product: updated });
        } catch (error) {
          results.push({ productId, success: false, error: error.message });
        }
      }

      await client.query("COMMIT");
      logger.info(
        `Bulk approved ${results.filter((r) => r.success).length} products`
      );

      return results;
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Error in bulk approval:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Ensure inventory record exists for product
   */
  async ensureInventoryExists(product) {
    const timeout = 5000; // 5 second timeout

    try {
      // Check if inventory already exists
      const checkResponse = await axios.get(
        `${INVENTORY_SERVICE_URL}/product/${product.id}`,
        { timeout }
      );

      if (checkResponse.data && checkResponse.data.data) {
        logger.info(
          `Inventory already exists for product ${product.id}, skipping creation`
        );
        return;
      }
    } catch (error) {
      // Handle timeout
      if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
        logger.error(
          `Timeout checking inventory for product ${product.id}: ${error.message}`
        );
        return; // Don't fail activation on timeout
      }

      // If 404, inventory doesn't exist - create it
      if (error.response && error.response.status === 404) {
        try {
          await axios.post(
            `${INVENTORY_SERVICE_URL}`,
            {
              product_id: product.id,
              sku: product.sku,
              quantity: 0, // Start with zero, warehouse staff will add stock
              warehouse_location: "DEFAULT",
              reorder_level: 10,
              max_stock_level: 1000,
            },
            { timeout }
          );
          logger.info(`Created inventory record for product ${product.id}`);
        } catch (createError) {
          if (
            createError.code === "ECONNABORTED" ||
            createError.code === "ETIMEDOUT"
          ) {
            logger.error(
              `Timeout creating inventory for product ${product.id}: ${createError.message}`
            );
          } else {
            logger.error(
              `Failed to create inventory for product ${product.id}:`,
              createError.message,
              createError.response?.data || ""
            );
          }
          // Don't fail the activation if inventory creation fails
        }
      } else {
        logger.error(
          `Error checking inventory for product ${product.id}:`,
          error.message,
          error.response?.data || ""
        );
      }
    }
  }
}

// Export the class itself to preserve static properties
module.exports = ProductLifecycleService;
