const db = require("../config/database");
const logger = require("../config/logger");

class Product {
  static async create(data) {
    const {
      sku,
      name,
      description,
      category_id,
      size,
      color,
      unit_price,
      attributes,
    } = data;

    const query = `
      INSERT INTO products (sku, name, description, category_id, size, color, unit_price, attributes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    try {
      const result = await db.query(query, [
        sku,
        name,
        description,
        category_id,
        size,
        color,
        unit_price,
        attributes ? JSON.stringify(attributes) : null,
      ]);
      return result.rows[0];
    } catch (error) {
      logger.error("Error creating product:", error);
      throw error;
    }
  }

  static async findAll(filters = {}) {
    let query = `
      SELECT p.*, c.name as category_name 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (filters.category_id) {
      query += ` AND p.category_id = $${paramCount}`;
      params.push(filters.category_id);
      paramCount++;
    }

    if (filters.is_active !== undefined) {
      query += ` AND p.is_active = $${paramCount}`;
      params.push(filters.is_active);
      paramCount++;
    }

    if (filters.search) {
      query += ` AND (p.name ILIKE $${paramCount} OR p.sku ILIKE $${paramCount} OR p.description ILIKE $${paramCount})`;
      params.push(`%${filters.search}%`);
      paramCount++;
    }

    query += " ORDER BY p.created_at DESC";

    try {
      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error("Error finding all products:", error);
      throw error;
    }
  }

  static async findById(id) {
    const query = `
      SELECT p.*, c.name as category_name 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = $1
    `;

    try {
      const result = await db.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      logger.error("Error finding product by ID:", error);
      throw error;
    }
  }

  static async findBySku(sku) {
    const query = `
      SELECT p.*, c.name as category_name 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.sku = $1
    `;

    try {
      const result = await db.query(query, [sku]);
      return result.rows[0];
    } catch (error) {
      logger.error("Error finding product by SKU:", error);
      throw error;
    }
  }

  static async update(id, data) {
    const fields = [];
    const params = [];
    let paramCount = 1;

    const allowedFields = [
      "sku",
      "name",
      "description",
      "category_id",
      "size",
      "color",
      "unit_price",
      "attributes",
      "is_active",
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        fields.push(`${field} = $${paramCount}`);
        params.push(
          field === "attributes" && data[field]
            ? JSON.stringify(data[field])
            : data[field]
        );
        paramCount++;
      }
    }

    if (fields.length === 0) {
      throw new Error("No fields to update");
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const query = `
      UPDATE products 
      SET ${fields.join(", ")}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    try {
      const result = await db.query(query, params);
      return result.rows[0];
    } catch (error) {
      logger.error("Error updating product:", error);
      throw error;
    }
  }

  static async delete(id) {
    const query = "DELETE FROM products WHERE id = $1 RETURNING *";

    try {
      const result = await db.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      logger.error("Error deleting product:", error);
      throw error;
    }
  }

  static async findByIds(ids) {
    const query = `
      SELECT p.*, c.name as category_name 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ANY($1)
    `;

    try {
      const result = await db.query(query, [ids]);
      return result.rows;
    } catch (error) {
      logger.error("Error finding products by IDs:", error);
      throw error;
    }
  }
}

module.exports = Product;
