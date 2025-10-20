const db = require("../config/database");
const logger = require("../config/logger");

class StockMovement {
  static async create(data) {
    const {
      product_id,
      sku,
      movement_type,
      quantity,
      reference_type,
      reference_id,
      notes,
      performed_by,
    } = data;

    const query = `
      INSERT INTO stock_movements (product_id, sku, movement_type, quantity, reference_type, reference_id, notes, performed_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    try {
      const result = await db.query(query, [
        product_id,
        sku,
        movement_type,
        quantity,
        reference_type,
        reference_id,
        notes,
        performed_by,
      ]);
      return result.rows[0];
    } catch (error) {
      logger.error("Error creating stock movement:", error);
      throw error;
    }
  }

  static async findAll(filters = {}) {
    let query = "SELECT * FROM stock_movements WHERE 1=1";
    const params = [];
    let paramCount = 1;

    if (filters.product_id) {
      query += ` AND product_id = $${paramCount}`;
      params.push(filters.product_id);
      paramCount++;
    }

    if (filters.movement_type) {
      query += ` AND movement_type = $${paramCount}`;
      params.push(filters.movement_type);
      paramCount++;
    }

    if (filters.start_date) {
      query += ` AND created_at >= $${paramCount}`;
      params.push(filters.start_date);
      paramCount++;
    }

    if (filters.end_date) {
      query += ` AND created_at <= $${paramCount}`;
      params.push(filters.end_date);
      paramCount++;
    }

    query += " ORDER BY created_at DESC LIMIT 100";

    try {
      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error("Error finding stock movements:", error);
      throw error;
    }
  }

  static async findByProductId(productId) {
    const query =
      "SELECT * FROM stock_movements WHERE product_id = $1 ORDER BY created_at DESC LIMIT 50";

    try {
      const result = await db.query(query, [productId]);
      return result.rows;
    } catch (error) {
      logger.error("Error finding stock movements by product ID:", error);
      throw error;
    }
  }
}

module.exports = StockMovement;
