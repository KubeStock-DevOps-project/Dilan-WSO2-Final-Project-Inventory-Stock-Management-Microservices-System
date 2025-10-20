const db = require("../config/database");
const logger = require("../config/logger");

class Inventory {
  static async create(data) {
    const {
      product_id,
      sku,
      quantity,
      warehouse_location,
      reorder_level,
      max_stock_level,
    } = data;

    const query = `
      INSERT INTO inventory (product_id, sku, quantity, warehouse_location, reorder_level, max_stock_level, last_restocked_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    try {
      const result = await db.query(query, [
        product_id,
        sku,
        quantity || 0,
        warehouse_location,
        reorder_level || 10,
        max_stock_level || 1000,
      ]);
      return result.rows[0];
    } catch (error) {
      logger.error("Error creating inventory:", error);
      throw error;
    }
  }

  static async findAll(filters = {}) {
    let query = "SELECT * FROM inventory WHERE 1=1";
    const params = [];
    let paramCount = 1;

    if (filters.product_id) {
      query += ` AND product_id = $${paramCount}`;
      params.push(filters.product_id);
      paramCount++;
    }

    if (filters.low_stock) {
      query += ` AND quantity <= reorder_level`;
    }

    query += " ORDER BY created_at DESC";

    try {
      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error("Error finding all inventory:", error);
      throw error;
    }
  }

  static async findByProductId(productId) {
    const query = "SELECT * FROM inventory WHERE product_id = $1";

    try {
      const result = await db.query(query, [productId]);
      return result.rows[0];
    } catch (error) {
      logger.error("Error finding inventory by product ID:", error);
      throw error;
    }
  }

  static async findBySku(sku) {
    const query = "SELECT * FROM inventory WHERE sku = $1";

    try {
      const result = await db.query(query, [sku]);
      return result.rows[0];
    } catch (error) {
      logger.error("Error finding inventory by SKU:", error);
      throw error;
    }
  }

  static async updateQuantity(productId, quantityChange, client = null) {
    const dbClient = client || db;
    const query = `
      UPDATE inventory 
      SET quantity = quantity + $1,
          updated_at = CURRENT_TIMESTAMP,
          last_restocked_at = CASE WHEN $1 > 0 THEN CURRENT_TIMESTAMP ELSE last_restocked_at END
      WHERE product_id = $2
      RETURNING *
    `;

    try {
      const result = await dbClient.query(query, [quantityChange, productId]);
      return result.rows[0];
    } catch (error) {
      logger.error("Error updating inventory quantity:", error);
      throw error;
    }
  }

  static async reserveStock(productId, quantity, client = null) {
    const dbClient = client || db;
    const query = `
      UPDATE inventory 
      SET reserved_quantity = reserved_quantity + $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE product_id = $2 AND (quantity - reserved_quantity) >= $1
      RETURNING *
    `;

    try {
      const result = await dbClient.query(query, [quantity, productId]);
      if (result.rows.length === 0) {
        throw new Error("Insufficient stock available");
      }
      return result.rows[0];
    } catch (error) {
      logger.error("Error reserving stock:", error);
      throw error;
    }
  }

  static async releaseStock(productId, quantity, client = null) {
    const dbClient = client || db;
    const query = `
      UPDATE inventory 
      SET reserved_quantity = GREATEST(0, reserved_quantity - $1),
          updated_at = CURRENT_TIMESTAMP
      WHERE product_id = $2
      RETURNING *
    `;

    try {
      const result = await dbClient.query(query, [quantity, productId]);
      return result.rows[0];
    } catch (error) {
      logger.error("Error releasing stock:", error);
      throw error;
    }
  }

  static async update(productId, data) {
    const fields = [];
    const params = [];
    let paramCount = 1;

    const allowedFields = [
      "warehouse_location",
      "reorder_level",
      "max_stock_level",
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        fields.push(`${field} = $${paramCount}`);
        params.push(data[field]);
        paramCount++;
      }
    }

    if (fields.length === 0) {
      throw new Error("No fields to update");
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(productId);

    const query = `
      UPDATE inventory 
      SET ${fields.join(", ")}
      WHERE product_id = $${paramCount}
      RETURNING *
    `;

    try {
      const result = await db.query(query, params);
      return result.rows[0];
    } catch (error) {
      logger.error("Error updating inventory:", error);
      throw error;
    }
  }
}

module.exports = Inventory;
